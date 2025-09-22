const { Actor } = require('apify');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// טעינת תצורת האתרים
const sitesConfig = require('./sites_config.json');

class InsuranceReportDownloader {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.userId = null;
    this.month = null;
  }

  async initialize() {
    this.supabase = await import('@supabase/supabase-js').then(m => 
      m.createClient(this.supabaseUrl, this.supabaseKey)
    );
  }

  async run() {
    try {
      await this.initialize();
      
      // קבלת פרמטרים מה-input
      const input = await Actor.getInput();
      this.userId = input.userId;
      this.month = input.month;

      if (!this.userId || !this.month) {
        throw new Error('Missing required parameters: userId and month');
      }

      // שליפת כל ה-jobs של המשתמש
      const { data: jobs, error } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('user_id', this.userId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch jobs: ${error.message}`);
      }

      console.log(`Found ${jobs.length} jobs to process`);

      // עיבוד כל job
      for (const job of jobs) {
        await this.processJob(job);
      }

    } catch (error) {
      console.error('Actor failed:', error);
      throw error;
    }
  }

  async processJob(job) {
    const siteConfig = sitesConfig.find(site => site.siteId === job.site_id);
    if (!siteConfig) {
      await this.updateJobStatus(job.id, 'error', null, `Site configuration not found for ${job.site_id}`);
      return;
    }

    console.log(`Processing job ${job.id} for site ${job.site_id}`);

    // עדכון סטטוס ל-running
    await this.updateJobStatus(job.id, 'running');

    let browser = null;
    try {
      // פתיחת דפדפן
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      // שליפת פרטי התחברות
      const { data: vendor, error: vendorError } = await this.supabase
        .from('user_insur_vendors')
        .select('*')
        .eq('user_id', job.user_id)
        .eq('site_id', job.site_id)
        .single();

      if (vendorError || !vendor) {
        throw new Error(`Vendor credentials not found for ${job.site_id}`);
      }

      // התחברות לאתר
      await this.loginToSite(page, siteConfig, vendor, job);

      // הורדת הדוח
      const fileUrl = await this.downloadReport(page, siteConfig, job);

      // עדכון סטטוס להצלחה
      await this.updateJobStatus(job.id, 'done', fileUrl);

      console.log(`Successfully processed job ${job.id}`);

    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      await this.updateJobStatus(job.id, 'error', null, error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async loginToSite(page, siteConfig, vendor, job) {
    console.log(`Logging into ${siteConfig.displayName}`);

    // מעבר לעמוד התחברות
    await page.goto(siteConfig.loginUrl, { waitUntil: 'networkidle' });

    // מילוי פרטי התחברות
    await page.fill(siteConfig.selectors.username, vendor.username);
    await page.fill(siteConfig.selectors.password, vendor.password);

    // לחיצה על כפתור התחברות
    await page.click(siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle');

    // בדיקה אם נדרש OTP
    if (siteConfig.needsOtp && vendor.needs_otp) {
      await this.handleOTP(page, siteConfig, job);
    }
  }

  async handleOTP(page, siteConfig, job) {
    console.log(`OTP required for ${siteConfig.displayName}`);

    // יצירת בקשה ל-OTP
    const { error: otpError } = await this.supabase
      .from('otp_requests')
      .insert({
        job_id: job.id,
        user_id: job.user_id,
        site_id: job.site_id,
        status: 'waiting'
      });

    if (otpError) {
      throw new Error(`Failed to create OTP request: ${otpError.message}`);
    }

    // עדכון סטטוס job ל-OTP
    await this.updateJobStatus(job.id, 'otp');

    // המתנה ל-OTP מהמשתמש
    const otp = await this.waitForOTP(job.id);
    
    if (!otp) {
      throw new Error('OTP not provided by user');
    }

    // הזנת OTP
    await page.fill(siteConfig.selectors.otpInput, otp);
    await page.click(siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle');

    // עדכון סטטוס OTP ל-consumed
    await this.supabase
      .from('otp_requests')
      .update({ status: 'consumed' })
      .eq('job_id', job.id);
  }

  async waitForOTP(jobId) {
    console.log('Waiting for OTP from user...');
    
    const maxWaitTime = 300000; // 5 דקות
    const checkInterval = 2000; // 2 שניות
    let waitTime = 0;

    while (waitTime < maxWaitTime) {
      const { data: otpRequest, error } = await this.supabase
        .from('otp_requests')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) {
        console.error('Error checking OTP:', error);
        continue;
      }

      if (otpRequest.status === 'submitted' && otpRequest.otp) {
        return otpRequest.otp;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    return null;
  }

  async downloadReport(page, siteConfig, job) {
    console.log(`Downloading report from ${siteConfig.displayName}`);

    // מעבר לעמוד הדוחות
    if (siteConfig.selectors.reportsPage) {
      await page.goto(siteConfig.selectors.reportsPage, { waitUntil: 'networkidle' });
    }

    // בחירת חודש
    if (siteConfig.selectors.monthSelect) {
      await page.selectOption(siteConfig.selectors.monthSelect, job.month);
      await page.waitForLoadState('networkidle');
    }

    // הגדרת handler להורדת קבצים
    const downloadPromise = page.waitForEvent('download');
    await page.click(siteConfig.selectors.downloadBtn);
    const download = await downloadPromise;

    // שמירת הקובץ
    const fileName = `${job.site_id}_${job.month}_${Date.now()}.xlsx`;
    const filePath = path.join('/tmp', fileName);
    await download.saveAs(filePath);

    // העלאה ל-Supabase Storage
    const fileUrl = await this.uploadToStorage(filePath, fileName, job.user_id);

    // מחיקת הקובץ הזמני
    fs.unlinkSync(filePath);

    return fileUrl;
  }

  async uploadToStorage(filePath, fileName, userId) {
    const fileBuffer = fs.readFileSync(filePath);
    
    const { data, error } = await this.supabase.storage
      .from('reports')
      .upload(`${userId}/${fileName}`, fileBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // קבלת URL ציבורי
    const { data: { publicUrl } } = this.supabase.storage
      .from('reports')
      .getPublicUrl(data.path);

    return publicUrl;
  }

  async updateJobStatus(jobId, status, fileUrl = null, errorMessage = null) {
    const updateData = { status };
    if (fileUrl) updateData.file_url = fileUrl;
    if (errorMessage) updateData.error_message = errorMessage;

    const { error } = await this.supabase
      .from('jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to update job ${jobId}:`, error);
    }
  }
}

// הרצת ה-Actor
Actor.main(async () => {
  const downloader = new InsuranceReportDownloader();
  await downloader.run();
});
