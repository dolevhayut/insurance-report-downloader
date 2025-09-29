const BaseProvider = require('./BaseProvider');

class YellinLapidotProvider extends BaseProvider {
  async fillLoginForm(page) {
    console.log('Filling Yellin Lapidot login form...');
    
    // הדפסת הערכים שאנחנו ממלאים
    const idValue = this.vendor.id || this.vendor.username;
    const phoneValue = this.vendor.phone || this.vendor.password;
    console.log(`ID to fill: ${idValue}`);
    console.log(`Phone to fill: ${phoneValue}`);
    
    // מילוי תעודת זהות
    const idField = page.locator(this.siteConfig.selectors.idField);
    if (await idField.count() > 0) {
      await idField.fill(idValue);
      console.log('Filled ID field');
      
      // בדיקה שהערך נכנס
      const filledId = await idField.inputValue();
      console.log(`ID field now contains: ${filledId}`);
    }
    
    // מילוי טלפון
    const phoneField = page.locator(this.siteConfig.selectors.phoneField);
    if (await phoneField.count() > 0) {
      await phoneField.fill(phoneValue);
      console.log('Filled phone field');
      
      // בדיקה שהערך נכנס
      const filledPhone = await phoneField.inputValue();
      console.log(`Phone field now contains: ${filledPhone}`);
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
      
      // חשוב! נוודא שהערך של ה-checkbox הוא "on"
      const checkboxValue = await firstCheckbox.getAttribute('value');
      console.log(`Checkbox value attribute: ${checkboxValue}`);
      
      // אם אין value, נוסיף
      if (!checkboxValue) {
        await page.evaluate(() => {
          const cb = document.querySelector('input[type="checkbox"]');
          if (cb) {
            cb.value = 'on';
            console.log('Set checkbox value to "on"');
          }
        });
      }
      
      const isChecked = await firstCheckbox.isChecked();
      
      if (!isChecked) {
        // ננסה כמה שיטות לסימון
        try {
          // שיטה 1: click רגיל
          await firstCheckbox.click();
          await page.waitForTimeout(500);
          
          // בדיקה אם עבד
          let nowChecked = await firstCheckbox.isChecked();
          if (!nowChecked) {
            console.log('Regular click failed, trying JavaScript...');
            
            // שיטה 2: סימון דרך JavaScript
            await page.evaluate(() => {
              const cb = document.querySelector('input[type="checkbox"]');
              if (cb) {
                cb.checked = true;
                // הפעלת event
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                cb.dispatchEvent(new Event('click', { bubbles: true }));
              }
            });
          }
          
          // בדיקה סופית
          nowChecked = await firstCheckbox.isChecked();
          console.log(`Terms checkbox is now: ${nowChecked ? 'checked' : 'unchecked'}`);
          
          // וידוא שה-name נכון
          const checkboxName = await firstCheckbox.getAttribute('name');
          console.log(`Checkbox name: ${checkboxName}`);
          
        } catch (e) {
          console.error('Error checking terms:', e.message);
        }
      } else {
        console.log('Terms already accepted');
      }
    }
  }

  async submitLoginForm(page) {
    console.log('Looking for continue button...');
    
    // לוג של כפתורים
    await this.logElements(page, 'button', 'button');
    
    // בדיקה סופית של כל השדות לפני שליחה
    console.log('\n=== FORM VALIDATION CHECK ===');
    const idValue = await page.locator(this.siteConfig.selectors.idField).inputValue();
    const phoneValue = await page.locator(this.siteConfig.selectors.phoneField).inputValue();
    const isTermsChecked = await page.locator('input[type="checkbox"]').first().isChecked();
    const isSmsSelected = await page.locator('input[type="radio"]').first().isChecked();
    
    console.log(`ID field: ${idValue}`);
    console.log(`Phone field: ${phoneValue}`);
    console.log(`Terms accepted: ${isTermsChecked}`);
    console.log(`SMS selected: ${isSmsSelected}`);
    
    if (!idValue || !phoneValue || !isTermsChecked) {
      throw new Error(`Form not properly filled - ID: ${!!idValue}, Phone: ${!!phoneValue}, Terms: ${isTermsChecked}`);
    }
    console.log('=== END VALIDATION CHECK ===\n');
    
    try {
      // חיפוש כפתור "המשך"
      const continueBtn = page.locator('button').filter({ hasText: 'המשך' }).first();
      if (await continueBtn.count() > 0) {
      console.log('Clicking continue button...');
      
      // האזנה לבקשות רשת לפני הלחיצה
      const responsePromise = new Promise((resolve) => {
        page.on('response', response => {
          const url = response.url();
          console.log(`[Network] ${response.status()} - ${url}`);
          
          if (url.includes('yl-invest')) {
            const headers = response.headers();
            console.log(`Response headers:`, headers);
            
            // אם זו בקשת API שחוזרת עם תוצאה
            if (url.includes('api') || url.includes('login') || url.includes('auth')) {
              response.text().then(body => {
                console.log(`Response body: ${body.substring(0, 200)}`);
              }).catch(() => {});
            }
          }
          
          // אם קיבלנו תגובה מוצלחת לבקשת login
          if (response.status() === 200 && url.includes('login')) {
            resolve(response);
          }
        });
      });
      
      // האזנה לבקשות שיוצאות
      page.on('request', request => {
        const url = request.url();
        if (url.includes('yl-invest') && !url.includes('.js') && !url.includes('.css')) {
          console.log(`[Request] ${request.method()} - ${url}`);
          const headers = request.headers();
          console.log(`Request headers:`, headers);
          
          // אם זו בקשת POST, נדפיס את ה-body
          if (request.method() === 'POST') {
            const postData = request.postData();
            if (postData) {
              console.log(`POST data: ${postData}`);
            }
          }
        }
      });
      
      // האזנה לשגיאות console
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Page console error:', msg.text());
        }
      });
      
      // ננסה כמה שיטות ללחיצה
      try {
        // קודם נוודא שה-checkbox באמת מוגדר נכון
        await page.evaluate(() => {
          const checkbox = document.querySelector('input[type="checkbox"][name="confirm"]');
          if (checkbox) {
            checkbox.checked = true;
            checkbox.value = 'on';
            // נוסיף גם attribute נוסף
            checkbox.setAttribute('checked', 'checked');
          }
        });

        // לחיצה רגילה עם force
        await continueBtn.click({ force: true });
        await page.waitForTimeout(3000); // המתנה ארוכה יותר לתגובה

        let newUrl = page.url();
        if (newUrl.includes('customer-search') || newUrl.includes('commissionsDetails')) {
          console.log('Successfully navigated after click!');
        } else if (newUrl.includes('login')) {
          console.log('Still on login page after click. Checking for errors/captcha again.');
          await this.saveScreenshot(page, 'after-failed-click');
          const pageContent = await page.content();
          if (pageContent.includes('reCAPTCHA') || pageContent.includes('אימות')) {
            console.log('reCAPTCHA or other verification still present on login page.');
            throw new Error('Login failed: reCAPTCHA or other verification blocking progress.');
          }
          // אם הגענו לכאן ועדיין על עמוד הלוגין, סימן שמשהו חוסם את ההתקדמות
          throw new Error('Login failed: Did not navigate from login page after submission, possibly due to unseen validation or bot detection.');
        }

      } catch (clickError) {
        console.error('Error during login attempts:', clickError.message);
        throw clickError;
      }

      // אם הגענו לכאן, סימן שהתהליך הצליח או שיש בעיה אחרת
      // נמשיך ל-OTP או לטיפול הבא
      await page.waitForLoadState('networkidle'); // נחכה שהעמוד יטען אחרי ניווט
      await this.saveScreenshot(page, 'after-login-attempt'); // שמירה של מצב העמוד לאחר ניסיון התחברות
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
    
    // בדיקה אם יש טקסט "יש לבחור סוכנות"
    const pageText = await page.textContent('body');
    if (!pageText.includes('יש לבחור סוכנות')) {
      console.log('Not on agency selection page');
      return;
    }
    
    console.log('On agency selection page');
    
    // לחיצה על ה-combobox
    const combobox = page.locator('select, [role="combobox"]').first();
    if (await combobox.count() > 0) {
      console.log('Found agency combobox');
      await combobox.click();
      await page.waitForTimeout(500);
      
      // חיפוש האופציה הנכונה
      if (this.vendor.agency) {
        console.log(`Looking for agency: ${this.vendor.agency}`);
        
        // נסיון ללחוץ על האופציה
        const option = page.locator(`option:has-text("${this.vendor.agency}")`).first();
        if (await option.count() > 0) {
          console.log('Clicking on agency option');
          await option.click();
        } else {
          // אם לא מצאנו, ננסה ללחוץ על האופציה השנייה (בדרך כלל זו הסוכנות)
          const secondOption = page.locator('option').nth(1);
          if (await secondOption.count() > 0) {
            console.log('Clicking second option as fallback');
            await secondOption.click();
          }
        }
      }
      
      await page.waitForTimeout(1000);
      
      // לחיצה על המשך
      const continueBtn = page.locator('button').filter({ hasText: 'המשך' }).first();
      if (await continueBtn.count() > 0) {
        console.log('Clicking continue after agency selection');
        await continueBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
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
