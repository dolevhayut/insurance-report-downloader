// דוגמה איך להפעיל את ה-Actor מהאפליקציה שלכם

const { ApifyClient } = require('apify-client');

/**
 * מפעיל את ה-Actor להורדת דוחות
 * @param {Object} params - פרמטרים להפעלת ה-Actor
 * @param {string} params.provider - ספק הביטוח (למשל 'yellin_lapidot')
 * @param {string} params.month - החודש להורדה (למשל '2025-09')
 * @param {Object} params.credentials - פרטי התחברות
 * @param {string} params.apifyToken - ה-API token
 */
async function runInsuranceActor(params) {
  const client = new ApifyClient({
    token: params.apifyToken,
  });

  const input = {
    mode: 'single',
    provider: params.provider,
    month: params.month,
    credentialsSource: 'manual',
    username: params.credentials.username,
    password: params.credentials.password,
    id: params.credentials.id,
    phone: params.credentials.phone,
    agency: params.credentials.agency,
    handleOtp: true,
    debugMode: false
  };

  try {
    // הפעלת ה-Actor
    const run = await client.actor('YOUR_ACTOR_ID').call(input, {
      waitForFinish: false // חשוב! לא לחכות לסיום
    });

    console.log(`Actor started with run ID: ${run.id}`);
    
    // מעקב אחרי ה-logs בזמן אמת
    const logStream = client.run(run.id).log().stream();
    
    return {
      runId: run.id,
      logStream,
      // פונקציה לבדיקת סטטוס OTP
      checkOtpNeeded: async () => {
        const logs = await client.run(run.id).log().get();
        const needsOtp = logs.items.some(log => 
          log.message.includes('OTP REQUIRED') || 
          log.message.includes('Waiting for OTP')
        );
        
        if (needsOtp) {
          // חיפוש ה-job ID בלוגים
          const jobIdMatch = logs.items.find(log => 
            log.message.includes('Processing job')
          )?.message.match(/job (\w+)/);
          
          const jobId = jobIdMatch ? jobIdMatch[1] : null;
          
          return {
            needed: true,
            jobId,
            provider: params.provider
          };
        }
        
        return { needed: false };
      },
      // פונקציה לשליחת OTP
      sendOtp: async (otp, jobId) => {
        const otpKey = `otp_${jobId}_${params.provider}`;
        await client.run(run.id).keyValueStore().setValue(otpKey, {
          otp: otp,
          timestamp: new Date().toISOString()
        });
      },
      // פונקציה לקבלת התוצאה הסופית
      getResult: async () => {
        const run = await client.run(run.id).get();
        if (run.status === 'SUCCEEDED') {
          const dataset = await client.run(run.id).dataset().listItems();
          return dataset.items;
        }
        throw new Error(`Actor failed: ${run.status}`);
      }
    };
  } catch (error) {
    console.error('Failed to run actor:', error);
    throw error;
  }
}

// דוגמה לשימוש מלא באפליקציה
async function fullExample() {
  const APIFY_TOKEN = 'apify_api_xxxxx';
  const ACTOR_ID = 'your-username/insurance-report-downloader';
  
  try {
    // 1. הפעלת ה-Actor
    const actorRun = await runInsuranceActor({
      provider: 'yellin_lapidot',
      month: '2025-09',
      credentials: {
        id: '052677580',
        phone: '0546405432',
        agency: 'אלעד עמרם'
      },
      apifyToken: APIFY_TOKEN
    });
    
    console.log('Actor started, monitoring for OTP...');
    
    // 2. מעקב אחרי הלוגים
    actorRun.logStream.on('data', (log) => {
      console.log(`[LOG] ${log.message}`);
    });
    
    // 3. בדיקה תקופתית אם צריך OTP
    const otpChecker = setInterval(async () => {
      const otpStatus = await actorRun.checkOtpNeeded();
      
      if (otpStatus.needed) {
        console.log('OTP needed! Job ID:', otpStatus.jobId);
        clearInterval(otpChecker);
        
        // כאן תציגו dialog למשתמש
        // const userOtp = await showOtpDialog();
        const userOtp = '123456'; // דוגמה
        
        // שליחת ה-OTP
        await actorRun.sendOtp(userOtp, otpStatus.jobId);
        console.log('OTP sent!');
      }
    }, 5000); // בדיקה כל 5 שניות
    
    // 4. חכייה לתוצאה (אופציונלי - אפשר לעשות polling)
    setTimeout(async () => {
      try {
        const results = await actorRun.getResult();
        console.log('Got results:', results);
      } catch (error) {
        console.error('Failed to get results:', error);
      }
    }, 300000); // 5 דקות
    
  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = { runInsuranceActor };
