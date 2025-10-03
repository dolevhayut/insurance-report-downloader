const BaseProvider = require('./BaseProvider');

class FnxProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded FnxProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling FNX login form...');
    // FNX uses ID (תעודת זהות) and password for login
    const { id, password } = this.vendor;
    
    // Fill ID field
    await page.fill(this.siteConfig.selectors.idField, id);
    console.log(`Filled ID field with: ${id}`);
    
    // Fill password field
    await page.fill(this.siteConfig.selectors.passwordField, password);
    console.log(`Filled password field`);

    await this.saveScreenshot(page, 'fnx-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting FNX login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'fnx-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for FNX...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'fnx-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'fnx-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for FNX...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'fnx-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading FNX report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'fnx-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for FNX report.');
    await this.saveScreenshot(page, 'fnx-download-initiated');
    return download;
  }
}

module.exports = FnxProvider;
