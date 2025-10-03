const BaseProvider = require('./BaseProvider');

class PassportcardProvider extends BaseProvider {
  constructor(siteConfig, vendor, job) {
    super(siteConfig, vendor, job);
    console.log(`Loaded PassportcardProvider for ${this.displayName}`);
  }

  async fillLoginForm(page) {
    console.log('Filling Passportcard login form...');
    // PassportCard uses email and mobile number for login
    const { id, phone, username } = this.vendor;
    
    // Fill email field (use username if provided, otherwise id)
    const email = username || id || '';
    await page.fill(this.siteConfig.selectors.emailField, email);
    console.log(`Filled email field with: ${email}`);
    
    // Fill mobile number field
    await page.fill(this.siteConfig.selectors.mobileField, phone);
    console.log(`Filled mobile field with: ${phone}`);

    await this.saveScreenshot(page, 'passportcard-form-filled');
    await page.waitForTimeout(1000);
  }

  async submitLoginForm(page) {
    console.log('Submitting Passportcard login form...');
    await page.click(this.siteConfig.selectors.loginBtn);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'passportcard-after-login-attempt');
  }

  async enterOTP(page, otp) {
    console.log('Entering OTP for Passportcard...');
    await page.fill(this.siteConfig.selectors.otpInput, otp);
    await this.saveScreenshot(page, 'passportcard-otp-entered');
    await page.click(this.siteConfig.selectors.otpSubmit);
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await this.saveScreenshot(page, 'passportcard-after-otp-submit');
  }

  async navigateToReports(page) {
    console.log('Navigating to reports for Passportcard...');
    await page.goto(this.siteConfig.selectors.reportsPage, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await this.saveScreenshot(page, 'passportcard-reports-page');
    await page.waitForTimeout(2000);
  }

  async downloadReport(page, month) {
    console.log(`Downloading Passportcard report for ${month}...`);

    await page.selectOption(this.siteConfig.selectors.monthSelect, month); 
    await page.waitForTimeout(2000);
    await this.saveScreenshot(page, 'passportcard-month-selected');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.click(this.siteConfig.selectors.downloadBtn)
    ]);
    console.log('Download initiated for Passportcard report.');
    await this.saveScreenshot(page, 'passportcard-download-initiated');
    return download;
  }
}

module.exports = PassportcardProvider;
