// דוגמה איך לשלוח OTP מהאפליקציה שלכם ל-Apify Actor

const { ApifyClient } = require('apify-client');

/**
 * שולח OTP ל-Actor שרץ
 * @param {string} actorRunId - ה-ID של ה-run (תקבלו אותו כשתפעילו את ה-Actor)
 * @param {string} jobId - ה-ID של ה-job (מוחזר מה-Actor)
 * @param {string} siteId - ה-ID של האתר (למשל 'yellin_lapidot')
 * @param {string} otp - קוד ה-OTP שהמשתמש הזין
 * @param {string} apifyToken - ה-API token שלכם ב-Apify
 */
async function sendOtpToActor(actorRunId, jobId, siteId, otp, apifyToken) {
  const client = new ApifyClient({
    token: apifyToken,
  });

  // המפתח חייב להיות זהה למה שה-Actor מחפש
  const otpKey = `otp_${jobId}_${siteId}`;
  
  try {
    // שליחת ה-OTP ל-Key-Value Store של ה-run
    await client.run(actorRunId).keyValueStore().setValue(otpKey, {
      otp: otp,
      timestamp: new Date().toISOString()
    });
    
    console.log(`OTP sent successfully: ${otp} for job ${jobId}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return false;
  }
}

/**
 * בודק את הסטטוס של בקשת OTP
 * @param {string} actorRunId - ה-ID של ה-run
 * @param {string} jobId - ה-ID של ה-job
 * @param {string} apifyToken - ה-API token שלכם
 */
async function checkOtpStatus(actorRunId, jobId, apifyToken) {
  const client = new ApifyClient({
    token: apifyToken,
  });

  try {
    const status = await client.run(actorRunId).keyValueStore().getValue(`otp_request_${jobId}`);
    return status;
  } catch (error) {
    console.error('Failed to check OTP status:', error);
    return null;
  }
}

// דוגמה לשימוש:
async function example() {
  const APIFY_TOKEN = 'apify_api_xxxxx'; // ה-token שלכם
  const actorRunId = 'xxxxx'; // תקבלו אותו כשתפעילו את ה-Actor
  const jobId = 'temp_1759152977363'; // תקבלו מה-logs או מה-status
  const siteId = 'yellin_lapidot';
  
  // בדיקת סטטוס - האם צריך OTP?
  const status = await checkOtpStatus(actorRunId, jobId, APIFY_TOKEN);
  console.log('OTP Status:', status);
  
  if (status && status.status === 'waiting') {
    console.log(`Need OTP for ${status.site}`);
    console.log(`SMS sent to phone ending with: ${status.phone_last_digits}`);
    
    // כאן תציגו dialog למשתמש להזין OTP
    const userOtp = '123456'; // הקוד שהמשתמש הזין
    
    // שליחת ה-OTP
    await sendOtpToActor(actorRunId, jobId, siteId, userOtp, APIFY_TOKEN);
  }
}

// אפשרות נוספת - שימוש ב-WebSocket לקבלת עדכונים בזמן אמת
// (דורש יותר עבודה אבל נותן חוויה טובה יותר)

module.exports = { sendOtpToActor, checkOtpStatus };
