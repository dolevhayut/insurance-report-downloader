const BaseProvider = require('./BaseProvider');

class MeitavProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded MeitavProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Meitav Dash login form...');
    // Meitav uses ID and phone (with prefix selection)
    const { id, phone } = this.vendor;
    
    await page.fill(this.siteConfig.selectors.idField, id);
    console.log(`Filled ID field with: ${id}`);
    
    // Extract phone prefix and number
    const phonePrefix = phone.substring(0, 3); // e.g., "050"
    const phoneNumber = phone.substring(3); // rest of the number
    
    await page.selectOption(this.siteConfig.selectors.phonePrefix, phonePrefix);
    console.log(`Selected phone prefix: ${phonePrefix}`);
    
    await page.fill(this.siteConfig.selectors.phoneField, phoneNumber);
    console.log(`Filled phone number: ${phoneNumber}`);

    await this.saveScreenshot(page, 'meitav-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Meitav login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'meitav-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Meitav...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'meitav-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'meitav-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Meitav...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'meitav-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Meitav report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'meitav-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Meitav report.');
    await this.saveScreenshot(page, 'meitav-download-initiated');
    return download;
  }
}

module.exports = MeitavProvider;

