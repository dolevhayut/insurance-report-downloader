const BaseProvider = require('./BaseProvider');

class AltshulerShahamProvider extends BaseProvider {
  async fillLoginForm(page) {
    console.log('Filling Altshuler Shaham login form...');
    
    // בחירת סוג הזדהות - רישיון
    if (this.siteConfig.selectors.idTypeRadio) {
      await page.click(this.siteConfig.selectors.idTypeRadio);
      console.log('Selected license type');
    }
    
    // מילוי מספר רישיון
    await page.fill(
      this.siteConfig.selectors.licenseField, 
      this.vendor.license || this.vendor.username
    );
    console.log('Filled license number');
    
    // מילוי תעודת זהות
    await page.fill(
      this.siteConfig.selectors.idField, 
      this.vendor.id || this.vendor.password
    );
    console.log('Filled ID number');
  }

  async submitLoginForm(page) {
    console.log('Submitting Altshuler Shaham login form...');
    
    // לחיצה על "שלחו לי קוד זיהוי"
    await page.click(this.siteConfig.selectors.sendCodeBtn);
    await page.waitForLoadState('networkidle');
    
    console.log('OTP request sent');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Altshuler Shaham...');
    
    // אלטשולר שחם משתמש ב-6 שדות נפרדים ל-OTP
    if (Array.isArray(this.siteConfig.selectors.otpFields)) {
      const otpDigits = otp.split('');
      const otpFields = this.siteConfig.selectors.otpFields;
      
      for (let i = 0; i < Math.min(otpDigits.length, otpFields.length); i++) {
        const field = page.locator(otpFields[i]);
        if (await field.count() > 0) {
          await field.fill(otpDigits[i]);
          console.log(`Filled OTP digit ${i + 1}`);
        }
      }
    } else {
      // fallback לשדה יחיד
      const otpInput = page.locator(this.siteConfig.selectors.otpInput);
      if (await otpInput.count() > 0) {
        await otpInput.fill(otp);
      }
    }
    
    // לחיצה על כפתור כניסה
    const loginBtn = page.locator(this.siteConfig.selectors.loginBtn);
    if (await loginBtn.count() > 0) {
      await loginBtn.click();
      await page.waitForLoadState('networkidle');
      console.log('Submitted OTP');
    }
  }

  async navigateToReports(page) {
    console.log('Navigating to Altshuler Shaham reports...');
    
    // לחיצה על תפריט (hamburger)
    if (this.siteConfig.selectors.menuBtn) {
      await page.click(this.siteConfig.selectors.menuBtn);
      await page.waitForTimeout(1000);
    }
    
    // לחיצה על עמלות
    if (this.siteConfig.selectors.commissionsMenu) {
      await page.click(this.siteConfig.selectors.commissionsMenu);
      await page.waitForLoadState('networkidle');
    }
    
    // או ניווט ישיר
    if (this.siteConfig.selectors.commissionsPage) {
      await page.goto(this.siteConfig.selectors.commissionsPage, {
        waitUntil: 'networkidle'
      });
    }
    
    await this.saveScreenshot(page, 'altshuler-reports');
  }

  async downloadReport(page, month) {
    console.log(`Downloading report for ${month} from Altshuler Shaham`);
    
    // בחירת סוג דוח
    const reportTypes = this.siteConfig.selectors.commissionReports;
    if (reportTypes && reportTypes['עמלות_נפרעים_גמל']) {
      const reportConfig = reportTypes['עמלות_נפרעים_גמל'];
      
      // ניווט ל-URL הספציפי אם יש
      if (reportConfig.url) {
        await page.goto(reportConfig.url, { waitUntil: 'networkidle' });
      } else if (reportConfig.selector) {
        await page.click(reportConfig.selector);
      }
      
      await page.waitForLoadState('networkidle');
    }
    
    // בחירת שנה וחודש
    if (this.siteConfig.selectors.yearSelect) {
      const year = month.split('-')[0];
      await page.selectOption(this.siteConfig.selectors.yearSelect, year);
    }
    
    if (this.siteConfig.selectors.monthSelect) {
      const monthNum = month.split('-')[1];
      await page.selectOption(this.siteConfig.selectors.monthSelect, monthNum);
    }
    
    // לחיצה על הצג
    if (this.siteConfig.selectors.showBtn) {
      await page.click(this.siteConfig.selectors.showBtn);
      await page.waitForLoadState('networkidle');
    }
    
    // הורדת הדוח
    const downloadBtn = this.siteConfig.selectors.downloadBtn || 
                       this.siteConfig.selectors.exportExcelBtn;
    
    if (downloadBtn) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await page.click(downloadBtn);
      const download = await downloadPromise;
      
      return download;
    }
    
    throw new Error('Could not find download button');
  }
}

module.exports = AltshulerShahamProvider;
