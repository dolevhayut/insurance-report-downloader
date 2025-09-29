const { Actor } = require('apify');
const { chromium } = require('playwright');
// const { LiveViewServer } = require('crawlee'); // מוסר עקב בעיות
const fs = require('fs');
const path = require('path');

// טעינת תצורת האתרים
const sitesConfig = require('./sites_config.json');
const ProviderFactory = require('./providers/ProviderFactory');

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
    const { provider, credentialsSource } = input;
    
    if (!provider) {
      throw new Error('Provider is required in single mode');
    }

    // קבלת פרטי התחברות
    let vendorCredentials;
    
    if (credentialsSource === 'manual') {
      // בניית אובייקט credentials מהשדות הבודדים
      vendorCredentials = {};
      if (input.username) vendorCredentials.username = input.username;
      if (input.password) vendorCredentials.password = input.password;
      if (input.id) vendorCredentials.id = input.id;
      if (input.license) vendorCredentials.license = input.license;
      if (input.phone) vendorCredentials.phone = input.phone;
      if (input.agency) vendorCredentials.agency = input.agency;
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
    let page = null;
    let liveView = null; // ישאר null ללא Live View

    try {
      // קבלת input עדכני
      const currentInput = await Actor.getInput() || {};

      // פתיחת דפדפן
      const isDebugMode = process.env.DEBUG_MODE === 'true' || currentInput.debugMode === true;

      browser = await chromium.launch({ 
        headless: !isDebugMode, // אם במצב דיבאג, הפעל עם UI
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // הגדרות נוספות לדיבאג
        ...(isDebugMode && {
          slowMo: 100, // האט פעולות ב-100ms
          devtools: false
        })
      });

      if (isDebugMode) {
        console.log('=== DEBUG MODE ENABLED ===');
        console.log('Browser running in non-headless mode');
        console.log('Actions will be slower for visibility');
      }

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'he-IL',
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive'
          // 'Upgrade-Insecure-Requests': '1' // מוסר עקב בעיות CORS עם reCAPTCHA
        },
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true
      });

      page = await context.newPage();

      // Live View (Crawlee) - הוסר
      /*
      if (isDebugMode) {
        try {
          if (typeof LiveViewServer !== 'undefined') {
            liveView = new LiveViewServer();
            await liveView.start();
            await liveView.addWebSocketToPlaywrightPage(page);
            console.log('Live View started and attached to page');
          } else {
            console.log('LiveViewServer not found in current Crawlee version, skipping Live View.');
          }
        } catch (e) {
          console.log('Live View failed to start:', e.message);
        }
      }
      */

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

      // יצירת provider instance
      const provider = ProviderFactory.getProvider(job.site_id, siteConfig, vendor, job);
      this.providerInstance = provider; // שמירת instance לגישה עתידית
      
      // התחברות
      await provider.login(page);

      // טיפול ב-OTP אם נדרש
      if (siteConfig.needsOtp && vendor.needs_otp !== false && this.handleOtp) {
        await provider.handleOTP(page);
      }

      // ניווט לעמוד הדוחות
      await provider.navigateToReports(page);

      // הורדת הדוח
      const download = await provider.downloadReport(page, this.month);

      // שמירת הקובץ
      const fileName = `${job.site_id}_${this.month}_${Date.now()}.xlsx`;
      const filePath = path.join('/tmp', fileName);
      await download.saveAs(filePath);

      // העלאה ל-Supabase Storage
      const fileUrl = await this.uploadToStorage(filePath, fileName, job.user_id);

      // מחיקת הקובץ הזמני
      fs.unlinkSync(filePath);

      // עדכון סטטוס להצלחה רק אם זה לא job זמני
      if (!job.id.startsWith('temp_')) {
        await this.updateJobStatus(job.id, 'done', fileUrl);
      } else {
        console.log(`Report downloaded successfully: ${fileUrl}`);
      }

      console.log(`Successfully processed job ${job.id}`);

    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);

      // שמירת screenshot לדיבאג
      if (page) {
        try {
          const screenshot = await page.screenshot({ fullPage: true });
          await Actor.setValue(`error-${job.site_id}-${Date.now()}`, screenshot, {
            contentType: 'image/png'
          });
        } catch (screenshotError) {
          console.error('Failed to save error screenshot:', screenshotError.message);
        }
      }

      if (!job.id.startsWith('temp_')) {
        await this.updateJobStatus(job.id, 'error', null, error.message);
      }
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
      // if (liveView) { // הוסר
      //   await liveView.stop().catch(() => {});
      // }
    }
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