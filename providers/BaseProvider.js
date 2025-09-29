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
    
    // יש לממש בכל ספק
    const otp = await this.waitForOTP();
    await this.enterOTP(page, otp);
  }

  async waitForOTP() {
    console.log('Waiting for OTP...');
    
    // אם זה job זמני, נחכה לקלט
    if (this.job.id.startsWith('temp_')) {
      console.log('\n=== OTP REQUIRED ===');
      console.log(`Please enter the OTP code for ${this.displayName}:`);
      console.log('You have 3 minutes to add "otp" field to the input in Apify Console');
      console.log('Go to Input tab and add: {"otp": "YOUR_CODE_HERE"}');
      
      const maxWaitTime = 180000; // 3 דקות
      const checkInterval = 5000; // בדיקה כל 5 שניות
      let waitedTime = 0;
      
      while (waitedTime < maxWaitTime) {
        // נבדוק אם יש OTP בקלט
        const additionalInput = await Actor.getInput();
        const otp = additionalInput?.otp;
        
        if (otp) {
          console.log('OTP received!');
          return otp;
        }
        
        // הצגת התקדמות
        const remainingTime = Math.ceil((maxWaitTime - waitedTime) / 1000);
        if (waitedTime % 30000 === 0) { // כל 30 שניות
          console.log(`Still waiting for OTP... ${remainingTime} seconds remaining`);
        }
        
        // המתנה לבדיקה הבאה
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitedTime += checkInterval;
      }
      
      throw new Error('OTP not provided within 3 minutes timeout');
    }
    
    // אחרת - טיפול רגיל דרך הדאטאבייס
    // TODO: implement database OTP handling
    throw new Error('Database OTP handling not implemented yet');
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
