const BaseProvider = require('./BaseProvider');

class HachsharaSecureProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded HachsharaSecureProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Hachshara login form...');
    const { username, password } = this.vendor;
    
    await page.fill(this.siteConfig.selectors.usernameField, username);
    console.log(`Filled username field with: ${username}`);
    
    await page.fill(this.siteConfig.selectors.passwordField, password);
    console.log(`Filled password field`);

    await this.saveScreenshot(page, 'hachshara-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Hachshara login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'hachshara-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Hachshara...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'hachshara-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'hachshara-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Hachshara...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'hachshara-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Hachshara report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'hachshara-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Hachshara report.');
    await this.saveScreenshot(page, 'hachshara-download-initiated');
    return download;
  }
}

module.exports = HachsharaSecureProvider;

