const BaseProvider = require('./BaseProvider');

class AnalystProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded AnalystProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Analyst login form...');
    // Analyst uses ID and phone for login
    const { id, phone } = this.vendor;
    
    await page.fill(this.siteConfig.selectors.idField, id);
    console.log(`Filled ID field with: ${id}`);
    
    await page.fill(this.siteConfig.selectors.phoneField, phone);
    console.log(`Filled phone field with: ${phone}`);

    await this.saveScreenshot(page, 'analyst-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Analyst login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'analyst-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Analyst...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'analyst-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'analyst-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Analyst...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'analyst-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Analyst report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'analyst-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Analyst report.');
    await this.saveScreenshot(page, 'analyst-download-initiated');
    return download;
  }
}

module.exports = AnalystProvider;

