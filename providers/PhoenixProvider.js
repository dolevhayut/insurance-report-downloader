const BaseProvider = require('./BaseProvider');

class PhoenixProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded PhoenixProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Phoenix (FNX) login form...');
    // Phoenix uses same portal as FNX: ID and password
    const { id, password } = this.vendor;
    
    await page.fill(this.siteConfig.selectors.idField, id);
    console.log(`Filled ID field with: ${id}`);
    
    await page.fill(this.siteConfig.selectors.passwordField, password);
    console.log(`Filled password field`);

    await this.saveScreenshot(page, 'phoenix-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Phoenix login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'phoenix-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Phoenix...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'phoenix-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'phoenix-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Phoenix...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'phoenix-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Phoenix report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'phoenix-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Phoenix report.');
    await this.saveScreenshot(page, 'phoenix-download-initiated');
    return download;
  }
}

module.exports = PhoenixProvider;

