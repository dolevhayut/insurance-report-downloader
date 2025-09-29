const BaseProvider = require('./BaseProvider');

class AyalonProvider extends BaseProvider {
  async fillLoginForm(page) {
    console.log('Filling Ayalon login form...');
    
    // מילוי שם משתמש
    await page.fill(this.siteConfig.selectors.username, this.vendor.username);
    console.log('Filled username');
    
    // מילוי סיסמה
    await page.fill(this.siteConfig.selectors.password, this.vendor.password);
    console.log('Filled password');
    
    // סימון checkbox אם יש
    if (this.siteConfig.selectors.termsCheckbox) {
      try {
        const checkbox = page.locator(this.siteConfig.selectors.termsCheckbox);
        if (await checkbox.count() > 0 && !await checkbox.isChecked()) {
          await checkbox.click();
          console.log('Accepted terms');
        }
      } catch (error) {
        console.log('No terms checkbox or already checked');
      }
    }
  }

  async submitLoginForm(page) {
    console.log('Submitting Ayalon login form...');
    
    // לחיצה על כפתור התחברות
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle');
    
    console.log('Login form submitted');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Ayalon...');
    
    // הזנת OTP
    const otpInput = page.locator(this.siteConfig.selectors.otpInput);
    if (await otpInput.count() > 0) {
      await otpInput.fill(otp);
      console.log('Filled OTP');
      
      // לחיצה על כפתור אישור
      const submitBtn = page.locator(this.siteConfig.selectors.otpSubmit);
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForLoadState('networkidle');
        console.log('Submitted OTP');
      }
    }
  }

  async navigateToReports(page) {
    console.log('Navigating to Ayalon reports...');
    
    // מעבר לעמוד הדוחות
    if (this.siteConfig.selectors.reportsPage) {
      await page.goto(this.siteConfig.selectors.reportsPage, {
        waitUntil: 'networkidle'
      });
    }
    
    // לחיצה על "כל הדוחות שלי"
    if (this.siteConfig.selectors.reportsMenuLink) {
      await page.click(this.siteConfig.selectors.reportsMenuLink);
      await page.waitForLoadState('networkidle');
    }
    
    // לחיצה על "גבייה ועמלות"
    if (this.siteConfig.selectors.commissionReportsLink) {
      await page.click(this.siteConfig.selectors.commissionReportsLink);
      await page.waitForLoadState('networkidle');
    }
    
    await this.saveScreenshot(page, 'ayalon-reports');
  }

  async downloadReport(page, month) {
    console.log(`Downloading report for ${month} from Ayalon`);
    
    // בחירת חודש אם יש
    if (this.siteConfig.selectors.monthSelect) {
      await page.selectOption(this.siteConfig.selectors.monthSelect, month);
      await page.waitForLoadState('networkidle');
    }
    
    // הורדת הדוח
    const downloadBtn = this.siteConfig.selectors.downloadBtn;
    
    if (downloadBtn) {
      const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
      await page.click(downloadBtn);
      const download = await downloadPromise;
      
      return download;
    }
    
    throw new Error('Could not find download button');
  }
}

module.exports = AyalonProvider;
