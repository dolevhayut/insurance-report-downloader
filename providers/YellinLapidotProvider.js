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
      
      console.log('About to click continue button...');
      
      // ננסה כמה שיטות ללחיצה
      try {
        // שיטה 1: לחיצה רגילה עם force
        await continueBtn.click({ force: true });
        await page.waitForTimeout(2000);
        
        // בדיקה אם עברנו עמוד
        let newUrl = page.url();
        if (newUrl === 'https://online.yl-invest.co.il/agents/login') {
          console.log('Regular click did not work, trying JavaScript click...');
          
          // שיטה 2: הפעלת הכפתור דרך JavaScript
          await page.evaluate(() => {
            const btn = document.querySelector('button');
            if (btn && btn.textContent.includes('המשך')) {
              console.log('Triggering button click via JavaScript');
              btn.click();
              
              // ננסה גם להפעיל events
              const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
              });
              btn.dispatchEvent(clickEvent);
            }
          });
          
          await page.waitForTimeout(2000);
          newUrl = page.url();
          
          if (newUrl === 'https://online.yl-invest.co.il/agents/login') {
            console.log('JavaScript click also did not work, trying form submit...');
            
            // שיטה 3: שליחת הטופס ישירות
            await page.evaluate(() => {
              const forms = document.querySelectorAll('form');
              if (forms.length > 0) {
                const form = forms[0];
                
                // בדיקה אם יש פונקציית onsubmit
                if (form.onsubmit) {
                  console.log('Calling form.onsubmit()');
                  const result = form.onsubmit();
                  if (result !== false) {
                    form.submit();
                  }
                } else {
                  console.log('Direct form.submit()');
                  form.submit();
                }
              }
            });
          }
        }
      } catch (clickError) {
        console.error('Error during click attempts:', clickError.message);
      }
      
      // המתנה קצרה לתגובת השרת
      await page.waitForTimeout(2000);
      
      // בדיקה אם נשארנו באותו עמוד
      const currentUrl = page.url();
      console.log(`After click URL: ${currentUrl}`);
      
      // בדיקה מקיפה יותר להודעות שגיאה
      const possibleErrorSelectors = [
        '.error', '.alert', '[role="alert"]', '.text-danger',
        '.message', '.notification', '.toast',
        'div[style*="color: red"]', 'span[style*="color: red"]',
        'div[class*="error"]', 'span[class*="error"]'
      ];
      
      for (const selector of possibleErrorSelectors) {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.trim().length > 0) {
            console.log(`Found message (${selector}): ${text.trim()}`);
          }
        }
      }
      
      // בדיקה אם יש אלמנט שמכיל את המילה "שגיאה" או "Error"
      const hebrewErrors = await page.locator('text=/שגיאה|תקלה|נכשל|בעיה/').all();
      for (const error of hebrewErrors) {
        console.log('Hebrew error found:', await error.textContent());
      }
      
      await this.saveScreenshot(page, 'after-continue');
      
      // אם נשארנו באותו עמוד, ננסה ללחוץ שוב
      if (currentUrl === 'https://online.yl-invest.co.il/agents/login') {
        console.log('Still on login page, might be validation error or captcha');
        
        // בדיקה אם יש captcha
        const captchaExists = await page.locator('iframe[src*="recaptcha"], div[class*="captcha"], .g-recaptcha').count() > 0;
        if (captchaExists) {
          console.log('CAPTCHA detected on page!');
          throw new Error('CAPTCHA verification required - manual intervention needed');
        }
        
        // בדיקה אם יש form בכלל
        const forms = await page.locator('form').all();
        console.log(`Found ${forms.length} forms on page`);
        
        // בדיקה אם הטופס נשלח בכלל
        const currentIdValue = await page.locator(this.siteConfig.selectors.idField).inputValue();
        const currentPhoneValue = await page.locator(this.siteConfig.selectors.phoneField).inputValue();
        console.log(`Form values after click - ID: ${currentIdValue}, Phone: ${currentPhoneValue}`);
        
        // ננסה ללחוץ על Enter במקום על הכפתור
        console.log('Trying to submit form with Enter key...');
        await page.locator(this.siteConfig.selectors.phoneField).press('Enter');
        await page.waitForTimeout(3000);
        
        const newUrl = page.url();
        if (newUrl === currentUrl) {
          console.log('Enter key also did not work, form might have JavaScript validation');
          
          // ננסה להפעיל את הטופס ישירות
          await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            if (forms.length > 0) {
              console.log('Submitting form directly via JavaScript');
              forms[0].submit();
            }
          });
          
          await page.waitForTimeout(3000);
        }
      }
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
