const { Actor } = require('apify');

class BaseProvider {
  constructor(siteConfig, vendor, job) {
    this.siteConfig = siteConfig;
    this.vendor = vendor;
    this.job = job;
    this.displayName = siteConfig.displayName;
  }

  async login(page) {
    console.log(`Logging into ${this.displayName}`);
    
    // מעבר לעמוד התחברות
    await this.navigateToLoginPage(page);
    
    // מילוי פרטי התחברות
    await this.fillLoginForm(page);
    
    // שליחת הטופס
    await this.submitLoginForm(page);
    
    // המתנה לאחר התחברות
    await page.waitForLoadState('networkidle');
    
    // טיפול בשלבי ביניים נוספים (כמו בחירת סוכנות)
    if (this.handlePostLogin) {
      await this.handlePostLogin(page);
    }
  }

  async navigateToLoginPage(page) {
    console.log(`Navigating to: ${this.siteConfig.loginUrl}`);
    
    const response = await page.goto(this.siteConfig.loginUrl, { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log(`Page loaded. Status: ${response.status()}, URL: ${page.url()}`);
    
    // שמירת screenshot
    await this.saveScreenshot(page, 'login-page');
    
    // המתנה נוספת
    await page.waitForTimeout(3000);
  }

  async fillLoginForm(page) {
    // יש לממש בכל ספק
    throw new Error('fillLoginForm must be implemented by provider');
  }

  async submitLoginForm(page) {
    // יש לממש בכל ספק
    throw new Error('submitLoginForm must be implemented by provider');
  }

  async handleOTP(page) {
    console.log(`OTP handling for ${this.displayName}`);
    
    // המתנה לטעינת עמוד OTP
    await page.waitForLoadState('networkidle');
    
    // שמירת screenshot
    await this.saveScreenshot(page, 'otp-page');
    
    // בדיקה אם באמת הגענו לעמוד OTP
    const pageText = await page.textContent('body');
    const hasOtpField = await page.locator('input[placeholder*="קוד"], input[placeholder*="הקלד"], input[type="tel"], input[type="number"]').count() > 0;
    
    // בדיקה מקיפה יותר - כולל טקסט על שליחת קוד
    const hasOtpText = pageText.includes('קוד') || pageText.includes('OTP') || 
                       pageText.includes('נשלח') || pageText.includes('הקלד');
    
    if (!hasOtpField && !hasOtpText) {
      console.log('WARNING: No OTP field found on page. Page content includes:');
      console.log(pageText.substring(0, 500));
      
      // בדיקה אם יש הודעת שגיאה
      const alerts = await page.locator('.alert, .error, [role="alert"]').all();
      for (const alert of alerts) {
        console.log('Alert found:', await alert.textContent());
      }
      
      // נדפיס את כל הטקסט הגלוי בעמוד לדיבאג
      console.log('\n=== FULL PAGE TEXT ===');
      console.log(pageText);
      console.log('=== END PAGE TEXT ===\n');
      
      throw new Error('OTP page not reached - SMS might not have been sent');
    }
    
    // יש לממש בכל ספק
    const otp = await this.waitForOTP();
    await this.enterOTP(page, otp);
  }

  async waitForOTP() {
    console.log('Waiting for OTP...');
    
    // יצירת מפתח ייחודי לOTP
    const otpKey = `otp_${this.job.id}_${this.job.site_id}`;
    
    // פרסום מידע על הצורך ב-OTP
    await Actor.setValue(`otp_request_${this.job.id}`, {
      status: 'waiting',
      site: this.displayName,
      site_id: this.job.site_id,
      job_id: this.job.id,
      timestamp: new Date().toISOString(),
      phone_last_digits: this.vendor.phone?.slice(-4) || 'unknown'
    });
    
    console.log('\n=== OTP REQUIRED ===');
    console.log(`Waiting for OTP code for ${this.displayName}`);
    console.log(`OTP Key: ${otpKey}`);
    console.log(`Job ID: ${this.job.id}`);
    console.log('The application should send the OTP using Actor.setValue()');
    
    const maxWaitTime = 180000; // 3 דקות
    const checkInterval = 2000; // בדיקה כל 2 שניות (מהיר יותר לזמן אמת)
    let waitedTime = 0;
    
    while (waitedTime < maxWaitTime) {
      try {
        // נבדוק אם יש OTP ב-Key-Value Store
        const otpData = await Actor.getValue(otpKey);
        
        if (otpData && otpData.otp) {
          console.log(`OTP received: ${otpData.otp}`);
          
          // נמחק את ה-OTP מהחנות לאבטחה
          await Actor.setValue(otpKey, null);
          
          // נעדכן את הסטטוס
          await Actor.setValue(`otp_request_${this.job.id}`, {
            status: 'received',
            timestamp: new Date().toISOString()
          });
          
          return otpData.otp;
        }
        
        // בדיקה גם ב-Input כגיבוי (לשימוש מהקונסולה)
        const additionalInput = await Actor.getInput();
        const otpFromInput = additionalInput?.otp || 
                           additionalInput?.OTP || 
                           additionalInput?.['OTP Code'] || 
                           additionalInput?.['otp_code'] ||
                           additionalInput?.otpCode;
        
        if (otpFromInput) {
          console.log(`OTP received from input: ${otpFromInput}`);
          return otpFromInput;
        }
        
      } catch (error) {
        console.log('Error checking for OTP:', error.message);
      }
      
      // הצגת התקדמות
      const remainingTime = Math.ceil((maxWaitTime - waitedTime) / 1000);
      if (waitedTime % 15000 === 0) { // כל 15 שניות
        console.log(`Still waiting for OTP... ${remainingTime} seconds remaining`);
      }
      
      // המתנה לבדיקה הבאה
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitedTime += checkInterval;
    }
    
    // עדכון סטטוס - נכשל
    await Actor.setValue(`otp_request_${this.job.id}`, {
      status: 'timeout',
      timestamp: new Date().toISOString()
    });
    
    throw new Error('OTP not provided within 3 minutes timeout');
  }

  async enterOTP(page, otp) {
    // יש לממש בכל ספק
    throw new Error('enterOTP must be implemented by provider');
  }

  async navigateToReports(page) {
    console.log(`Navigating to reports for ${this.displayName}`);
    
    // בדיקה אם יש URL ישיר
    if (this.siteConfig.selectors.commissionsPage) {
      await page.goto(this.siteConfig.selectors.commissionsPage, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
    } else if (this.siteConfig.selectors.commissionsMenu) {
      await page.click(this.siteConfig.selectors.commissionsMenu);
      await page.waitForLoadState('networkidle');
    }
    
    await this.saveScreenshot(page, 'reports-page');
  }

  async downloadReport(page, month) {
    console.log(`Downloading report for ${month}`);
    
    // יש לממש בכל ספק
    throw new Error('downloadReport must be implemented by provider');
  }

  async saveScreenshot(page, name) {
    try {
      const screenshot = await page.screenshot({ fullPage: true });
      await Actor.setValue(`${name}-${this.job.site_id}-${Date.now()}`, screenshot, {
        contentType: 'image/png'
      });
      console.log(`Screenshot saved: ${name}`);
    } catch (error) {
      console.error(`Failed to save screenshot: ${error.message}`);
    }
  }

  // Utility methods
  async logElements(page, selector, type = 'element') {
    const elements = await page.locator(selector).all();
    console.log(`Found ${elements.length} ${type}s`);
    
    for (let i = 0; i < Math.min(elements.length, 10); i++) {
      const text = await elements[i].textContent().catch(() => '');
      const isVisible = await elements[i].isVisible().catch(() => false);
      console.log(`${type} ${i}: "${text?.trim()}", visible=${isVisible}`);
    }
    
    return elements;
  }
}

module.exports = BaseProvider;
