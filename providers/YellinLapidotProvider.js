const BaseProvider = require('./BaseProvider');

class YellinLapidotProvider extends BaseProvider {
  async fillLoginForm(page) {
    console.log('Filling Yellin Lapidot login form...');
    
    // מילוי תעודת זהות
    const idField = page.locator(this.siteConfig.selectors.idField);
    if (await idField.count() > 0) {
      await idField.fill(this.vendor.id || this.vendor.username);
      console.log('Filled ID field');
    }
    
    // מילוי טלפון
    const phoneField = page.locator(this.siteConfig.selectors.phoneField);
    if (await phoneField.count() > 0) {
      await phoneField.fill(this.vendor.phone || this.vendor.password);
      console.log('Filled phone field');
    }
    
    // בחירת SMS
    await this.selectSMSOption(page);
    
    // סימון תנאי שימוש
    await this.acceptTerms(page);
  }

  async selectSMSOption(page) {
    console.log('Looking for SMS radio button...');
    
    // לוג של כל ה-radio buttons
    await this.logElements(page, 'input[type="radio"]', 'radio');
    
    try {
      // נסה ללחוץ על label עם טקסט SMS
      const smsLabel = page.locator('label').filter({ hasText: 'SMS' }).first();
      if (await smsLabel.count() > 0) {
        console.log('Found SMS label, clicking...');
        await smsLabel.click();
      } else {
        // לחץ על הראשון (בדרך כלל SMS)
        const firstRadio = page.locator('input[type="radio"]').first();
        if (await firstRadio.count() > 0) {
          await firstRadio.click();
          console.log('Clicked first radio button');
        }
      }
    } catch (error) {
      console.log('Error selecting SMS:', error.message);
    }
  }

  async acceptTerms(page) {
    console.log('Looking for terms checkbox...');
    
    // לוג של checkboxes
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`Found ${checkboxes.length} checkboxes`);
    
    if (checkboxes.length > 0) {
      const firstCheckbox = checkboxes[0];
      const isChecked = await firstCheckbox.isChecked();
      
      if (!isChecked) {
        await firstCheckbox.click();
        console.log('Clicked terms checkbox');
      } else {
        console.log('Terms already accepted');
      }
    }
  }

  async submitLoginForm(page) {
    console.log('Looking for continue button...');
    
    // לוג של כפתורים
    await this.logElements(page, 'button', 'button');
    
    try {
      // חיפוש כפתור "המשך"
      const continueBtn = page.locator('button').filter({ hasText: 'המשך' }).first();
      if (await continueBtn.count() > 0) {
        console.log('Clicking continue button...');
        await continueBtn.click();
        
        // המתנה למעבר לעמוד הבא
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'networkidle' }),
          page.waitForTimeout(5000)
        ]);
        
        await this.saveScreenshot(page, 'after-continue');
        console.log(`Current URL: ${page.url()}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error.message);
      throw error;
    }
  }

  async enterOTP(page, otp) {
    console.log('Looking for OTP input field...');
    
    // המתנה שהעמוד יטען
    await page.waitForLoadState('networkidle');
    
    // חיפוש שדה הקוד - בילין לפידות זה שדה אחד עם placeholder "הקלד קוד"
    const otpInput = page.locator('input[placeholder="הקלד קוד"]');
    if (await otpInput.count() > 0) {
      console.log('Found OTP input field');
      await otpInput.fill(otp);
      
      // לחיצה על כפתור המשך
      const continueBtn = page.locator('button').filter({ hasText: 'המשך' });
      if (await continueBtn.count() > 0) {
        console.log('Clicking continue button...');
        await continueBtn.click();
        await page.waitForLoadState('networkidle');
      }
    } else {
      throw new Error('Could not find OTP input field');
    }
  }

  async handlePostLogin(page) {
    // בילין לפידות יש עמוד בחירת סוכנות אחרי ה-OTP
    await this.handleAgencySelection(page);
  }
  
  async handleAgencySelection(page) {
    console.log('Checking for agency selection page...');
    
    // בדיקה אם אנחנו בעמוד בחירת סוכנות
    const agencyCombobox = page.locator('input[role="combobox"]');
    if (await agencyCombobox.count() > 0 && this.vendor.agency) {
      console.log(`Selecting agency: ${this.vendor.agency}`);
      
      // הקלדת שם הסוכנות
      await agencyCombobox.fill(this.vendor.agency);
      await page.waitForTimeout(1000); // המתנה ל-autocomplete
      
      // בחירת האופציה מהרשימה
      const option = page.locator(`option:has-text("${this.vendor.agency}")`);
      if (await option.count() > 0) {
        await option.click();
      }
      
      // לחיצה על המשך
      const continueBtn = page.locator('button').filter({ hasText: 'המשך' });
      if (await continueBtn.count() > 0) {
        await continueBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }
  }
  
  async navigateToReports(page) {
    // תחילה נטפל בבחירת סוכנות אם נדרש
    await this.handleAgencySelection(page);
    
    // נשתמש ב-URL ישיר אם יש
    if (this.siteConfig.selectors.commissionsPage) {
      console.log('Navigating directly to commissions page');
      await page.goto(this.siteConfig.selectors.commissionsPage, {
        waitUntil: 'networkidle'
      });
    } else {
      // או דרך התפריט
      await super.navigateToReports(page);
    }
  }

  async downloadReport(page, month) {
    console.log(`Downloading report for ${month} from Yellin Lapidot`);
    
    // בחירת חודש אם יש
    if (this.siteConfig.selectors.monthFromField) {
      await page.fill(this.siteConfig.selectors.monthFromField, month);
    }
    if (this.siteConfig.selectors.monthToField) {
      await page.fill(this.siteConfig.selectors.monthToField, month);
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

module.exports = YellinLapidotProvider;
