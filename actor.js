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
      this.month = input.month;
      this.handleOtp = input.handleOtp !== false;

      if (!this.month) {
        throw new Error('Missing required parameter: month');
      }

      // טיפול במודים שונים
      if (input.mode === 'single') {
        // מוד יחיד - הרצה של ספק אחד
        await this.runSingleProvider(input);
      } else {
        // מוד מרובה - הרצה של כל הספקים מהדאטאבייס
        this.userId = input.userId;
        if (!this.userId) {
          throw new Error('Missing required parameter: userId for all providers mode');
        }
        await this.runAllProviders();
      }

    } catch (error) {
      console.error('Actor failed:', error);
      throw error;
    }
  }

  async runSingleProvider(input) {
    const { provider, credentialsSource, credentials } = input;
    
    if (!provider) {
      throw new Error('Provider is required in single mode');
    }

    // קבלת פרטי התחברות
    let vendorCredentials;
    
    if (credentialsSource === 'manual') {
      vendorCredentials = credentials;
    } else if (credentialsSource === 'mapping') {
      // טעינת פרטי התחברות מהמיפוי
      try {
        const credentialsMapping = require('./credentials_mapping.json');
        vendorCredentials = credentialsMapping.credentials[provider];
        if (!vendorCredentials) {
          throw new Error(`No credentials found for provider: ${provider}`);
        }
      } catch (error) {
        throw new Error(`Failed to load credentials mapping: ${error.message}`);
      }
    } else if (credentialsSource === 'supabase') {
      // שליפת פרטי התחברות מהדאטאבייס
      if (!input.userId) {
        throw new Error('userId is required when using Supabase credentials');
      }
      const { data: vendor, error } = await this.supabase
        .from('user_insur_vendors')
        .select('*')
        .eq('user_id', input.userId)
        .eq('site_id', provider)
        .single();
        
      if (error || !vendor) {
        throw new Error(`No credentials found in database for provider: ${provider}`);
      }
      vendorCredentials = vendor;
    }

    // יצירת job זמני
    const job = {
      id: `temp_${Date.now()}`,
      user_id: input.userId || 'manual',
      site_id: provider,
      month: this.month,
      status: 'running'
    };

    console.log(`Running single provider: ${provider}`);
    await this.processJob(job, vendorCredentials);
  }

  async runAllProviders() {
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
  }

  async processJob(job, providedVendor = null) {
    const siteConfig = sitesConfig.find(site => site.siteId === job.site_id);
    if (!siteConfig) {
      await this.updateJobStatus(job.id, 'error', null, `Site configuration not found for ${job.site_id}`);
      return;
    }

    console.log(`Processing job ${job.id} for site ${job.site_id}`);

    // עדכון סטטוס ל-running רק אם זה לא job זמני
    if (!job.id.startsWith('temp_')) {
      await this.updateJobStatus(job.id, 'running');
    }

    let browser = null;
    try {
      // פתיחת דפדפן
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      // קבלת פרטי התחברות
      let vendor = providedVendor;
      
      if (!vendor) {
        // שליפת פרטי התחברות מהדאטאבייס
        const { data: dbVendor, error: vendorError } = await this.supabase
          .from('user_insur_vendors')
          .select('*')
          .eq('user_id', job.user_id)
          .eq('site_id', job.site_id)
          .single();

        if (vendorError || !dbVendor) {
          throw new Error(`Vendor credentials not found for ${job.site_id}`);
        }
        vendor = dbVendor;
      }

      // התחברות לאתר
      await this.loginToSite(page, siteConfig, vendor, job);

      // הורדת הדוח
      const fileUrl = await this.downloadReport(page, siteConfig, job);

      // עדכון סטטוס להצלחה רק אם זה לא job זמני
      if (!job.id.startsWith('temp_')) {
        await this.updateJobStatus(job.id, 'done', fileUrl);
      } else {
        console.log(`Report downloaded successfully: ${fileUrl}`);
      }

      console.log(`Successfully processed job ${job.id}`);

    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
      if (!job.id.startsWith('temp_')) {
        await this.updateJobStatus(job.id, 'error', null, error.message);
      }
      throw error;
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

    // טיפול בסוגי התחברות שונים
    if (siteConfig.siteId === 'yellin_lapidot') {
      // ילין לפידות - תעודת זהות וטלפון
      await page.fill(siteConfig.selectors.idField, vendor.id || vendor.username);
      await page.fill(siteConfig.selectors.phoneField, vendor.phone || vendor.password);
      
      // בחירת SMS אם יש
      if (siteConfig.selectors.smsRadio) {
        await page.click(siteConfig.selectors.smsRadio);
      }
      
      // סימון צ'קבוקס תנאי שימוש
      if (siteConfig.selectors.termsCheckbox) {
        await page.click(siteConfig.selectors.termsCheckbox);
      }
      
      // לחיצה על כפתור המשך
      await page.click(siteConfig.selectors.continueBtn);
      
    } else if (siteConfig.siteId === 'altshuler_shaham') {
      // אלטשולר שחם - רישיון ותעודת זהות
      if (siteConfig.selectors.idTypeRadio) {
        await page.click(siteConfig.selectors.idTypeRadio);
      }
      await page.fill(siteConfig.selectors.licenseField, vendor.license || vendor.username);
      await page.fill(siteConfig.selectors.idField, vendor.id || vendor.password);
      
      // לחיצה על שלח קוד
      await page.click(siteConfig.selectors.sendCodeBtn);
      
    } else {
      // התחברות רגילה - שם משתמש וסיסמה
      await page.fill(siteConfig.selectors.username, vendor.username);
      await page.fill(siteConfig.selectors.password, vendor.password);
      
      // סימון צ'קבוקס תנאי שימוש אם יש
      if (siteConfig.selectors.termsCheckbox) {
        await page.click(siteConfig.selectors.termsCheckbox);
      }
      
      // לחיצה על כפתור התחברות
      await page.click(siteConfig.selectors.loginBtn);
    }
    
    await page.waitForLoadState('networkidle');

    // בדיקה אם נדרש OTP
    if (siteConfig.needsOtp && vendor.needs_otp) {
      await this.handleOTP(page, siteConfig, job);
    }
  }

  async handleOTP(page, siteConfig, job) {
    console.log(`OTP required for ${siteConfig.displayName}`);

    // בדיקה אם להמתין ל-OTP
    if (!this.handleOtp) {
      throw new Error('OTP required but handleOtp is disabled');
    }

    let otp;
    
    // אם זה job זמני, נבקש OTP מה-console
    if (job.id.startsWith('temp_')) {
      console.log('\n=== OTP REQUIRED ===');
      console.log(`Please enter the OTP code for ${siteConfig.displayName}:`);
      console.log('Waiting for OTP input in Apify logs...');
      console.log('\nNote: In production, enter the OTP in the Apify console input field.');
      
      // בסביבת Apify, ניתן להזין את ה-OTP דרך ה-console
      // כאן נחכה זמן קבוע ונניח שהמשתמש יזין את הקוד
      await new Promise(resolve => setTimeout(resolve, 60000)); // המתנה של דקה
      
      // בפועל, ב-Apify יש אפשרות להזין input נוסף תוך כדי ריצה
      const additionalInput = await Actor.getInput();
      otp = additionalInput?.otp;
      
      if (!otp) {
        throw new Error('OTP not provided within timeout');
      }
    } else {
      // יצירת בקשה ל-OTP בדאטאבייס
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
      otp = await this.waitForOTP(job.id);
      
      if (!otp) {
        throw new Error('OTP not provided by user');
      }
    }

    // הזנת OTP
    if (siteConfig.siteId === 'altshuler_shaham' && Array.isArray(siteConfig.selectors.otpFields)) {
      // אלטשולר שחם - 6 שדות נפרדים ל-OTP
      const otpDigits = otp.split('');
      for (let i = 0; i < Math.min(otpDigits.length, siteConfig.selectors.otpFields.length); i++) {
        await page.fill(siteConfig.selectors.otpFields[i], otpDigits[i]);
      }
    } else {
      // OTP רגיל - שדה אחד
      await page.fill(siteConfig.selectors.otpInput, otp);
    }
    
    // לחיצה על כפתור אישור
    if (siteConfig.selectors.otpSubmit) {
      await page.click(siteConfig.selectors.otpSubmit);
    } else if (siteConfig.selectors.loginBtn) {
      await page.click(siteConfig.selectors.loginBtn);
    }
    
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
    // אם זה job זמני, רק נדפיס לוג
    if (jobId.startsWith('temp_')) {
      console.log(`[Temp Job ${jobId}] Status: ${status}${fileUrl ? `, File: ${fileUrl}` : ''}${errorMessage ? `, Error: ${errorMessage}` : ''}`);
      return;
    }
    
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
