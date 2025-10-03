const BaseProvider = require('./BaseProvider');

class MorProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded MorProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Mor (More) login form...');
    // Mor uses license number, user ID, and phone
    const { license, id, phone } = this.vendor;
    
    await page.fill(this.siteConfig.selectors.licenseField, license || id);
    console.log(`Filled license field with: ${license || id}`);
    
    await page.fill(this.siteConfig.selectors.userIdField, id);
    console.log(`Filled user ID field with: ${id}`);
    
    await page.fill(this.siteConfig.selectors.phoneField, phone);
    console.log(`Filled phone field with: ${phone}`);

    await this.saveScreenshot(page, 'mor-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Mor login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'mor-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Mor...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'mor-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'mor-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Mor...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'mor-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Mor report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'mor-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Mor report.');
    await this.saveScreenshot(page, 'mor-download-initiated');
    return download;
  }
}

module.exports = MorProvider;

