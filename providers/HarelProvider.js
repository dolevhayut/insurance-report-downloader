const BaseProvider = require('./BaseProvider');

class HarelProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded HarelProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Harel login form...');
    // Harel uses username and password for login
    const { username, password } = this.vendor;
    
    // Fill username field
    await page.fill(this.siteConfig.selectors.usernameField, username);
    console.log(`Filled username field with: ${username}`);
    
    // Fill password field
    await page.fill(this.siteConfig.selectors.passwordField, password);
    console.log(`Filled password field`);

    await this.saveScreenshot(page, 'harel-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Harel login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    // Harel loads slowly, so increase timeout
    await page.waitForLoadState('networkidle', { timeout: 90000 });
    await this.saveScreenshot(page, 'harel-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Harel...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'harel-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 90000 });
    await this.saveScreenshot(page, 'harel-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Harel...');
    // Harel loads slowly
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 90000
    });
    await this.saveScreenshot(page, 'harel-reports-page');
    await page.waitForTimeout(3000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Harel report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(3000);
    await this.saveScreenshot(page, 'harel-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 90000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Harel report.');
    await this.saveScreenshot(page, 'harel-download-initiated');
    return download;
  }
}

module.exports = HarelProvider;
