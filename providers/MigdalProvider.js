const BaseProvider = require('./BaseProvider');

class MigdalProvider extends BaseProvider {
  async fillLoginForm(page) {
    console.log('Filling Migdal login form...');
    
    // מילוי שם משתמש
    await page.fill(this.siteConfig.selectors.username, this.vendor.username);
    console.log('Filled username');
    
    // מילוי סיסמה
    await page.fill(this.siteConfig.selectors.password, this.vendor.password);
    console.log('Filled password');
  }

  async submitLoginForm(page) {
    console.log('Submitting Migdal login form...');
    
    // לחיצה על כפתור התחברות
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle');
    
    console.log('Login form submitted');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Migdal...');
    
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
    console.log('Navigating to Migdal reports...');
    
    // מעבר ללובי הדוחות
    if (this.siteConfig.selectors.reportsPage) {
      await page.goto(this.siteConfig.selectors.reportsPage, {
        waitUntil: 'networkidle'
      });
    }
    
    // לחיצה על כפתור דוחות
    if (this.siteConfig.selectors.reportsMenuBtn) {
      await page.click(this.siteConfig.selectors.reportsMenuBtn);
      await page.waitForLoadState('networkidle');
    }
    
    // בחירת קטגוריית הסכמים ועמלות
    if (this.siteConfig.selectors.commissionCategoryBtn) {
      await page.click(this.siteConfig.selectors.commissionCategoryBtn);
      await page.waitForLoadState('networkidle');
    }
    
    await this.saveScreenshot(page, 'migdal-reports');
  }

  async downloadReport(page, month) {
    console.log(`Downloading report for ${month} from Migdal`);
    
    // בחירת סוג דוח
    const reportTypes = this.siteConfig.selectors.commissionReports;
    if (reportTypes && typeof reportTypes === 'object') {
      // נבחר את הדוח הראשון כברירת מחדל
      const firstReportKey = Object.keys(reportTypes)[0];
      const firstReportSelector = reportTypes[firstReportKey];
      
      console.log(`Selecting report type: ${firstReportKey}`);
      await page.click(firstReportSelector);
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

module.exports = MigdalProvider;
