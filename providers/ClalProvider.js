const BaseProvider = require('./BaseProvider');

class ClalProvider extends BaseProvider {
  async navigateToLoginPage(page) {
    console.log('Navigating to Clal login page...');
    
    // תחילה נכנס לאתר הראשי
    await page.goto(this.siteConfig.loginUrl, { 
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // לחיצה על כפתור פורטלים
    if (this.siteConfig.selectors.mainSitePortalsBtn) {
      await page.click(this.siteConfig.selectors.mainSitePortalsBtn);
      await page.waitForTimeout(2000);
    }
    
    // לחיצה על פורטל סוכנים
    if (this.siteConfig.selectors.agentPortalLink) {
      await page.click(this.siteConfig.selectors.agentPortalLink);
      await page.waitForLoadState('networkidle');
    }
    
    // אם יש URL נפרד לפורטל
    if (this.siteConfig.portalUrl && page.url() !== this.siteConfig.portalUrl) {
      await page.goto(this.siteConfig.portalUrl, {
        waitUntil: 'networkidle'
      });
    }
    
    await this.saveScreenshot(page, 'clal-login-page');
  }

  async fillLoginForm(page) {
    console.log('Filling Clal login form...');
    
    // מילוי שם משתמש
    await page.fill(this.siteConfig.selectors.username, this.vendor.username);
    console.log('Filled username');
    
    // מילוי סיסמה
    await page.fill(this.siteConfig.selectors.password, this.vendor.password);
    console.log('Filled password');
  }

  async submitLoginForm(page) {
    console.log('Submitting Clal login form...');
    
    // לחיצה על כפתור התחברות
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle');
    
    console.log('Login form submitted');
    
    // כלל לא דורש OTP בדרך כלל
    this.siteConfig.needsOtp = false;
  }

  async navigateToReports(page) {
    console.log('Navigating to Clal reports...');
    
    // ניווט ישיר לעמוד העמלות
    if (this.siteConfig.selectors.commissionsPage) {
      await page.goto(this.siteConfig.selectors.commissionsPage, {
        waitUntil: 'networkidle'
      });
    }
    
    // או דרך התפריט
    const reportLinks = this.siteConfig.selectors.commissionReports;
    if (reportLinks) {
      // לחיצה על "עמלות וזכירות"
      if (reportLinks['עמלות_וזכירות']) {
        await page.click(reportLinks['עמלות_וזכירות']);
        await page.waitForLoadState('networkidle');
      }
      
      // לחיצה על "לפירוט עמלות"
      if (reportLinks['לפירוט_עמלות']) {
        await page.click(reportLinks['לפירוט_עמלות']);
        await page.waitForLoadState('networkidle');
      }
    }
    
    await this.saveScreenshot(page, 'clal-reports');
  }

  async downloadReport(page, month) {
    console.log(`Downloading report for ${month} from Clal`);
    
    // בחירת חודש
    if (this.siteConfig.selectors.monthSelect) {
      // כלל משתמש בפורמט מיוחד לחודשים
      const [year, monthNum] = month.split('-');
      const monthNames = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
      ];
      const monthName = monthNames[parseInt(monthNum) - 1];
      const monthText = `${monthName} ${year}`;
      
      try {
        await page.selectOption(this.siteConfig.selectors.monthSelect, { label: monthText });
      } catch (error) {
        console.log(`Could not select month by label, trying by value: ${month}`);
        await page.selectOption(this.siteConfig.selectors.monthSelect, month);
      }
    }
    
    // לחיצה על חפש
    if (this.siteConfig.selectors.searchBtn) {
      await page.click(this.siteConfig.selectors.searchBtn);
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

module.exports = ClalProvider;
