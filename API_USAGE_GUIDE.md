# מדריך שימוש ב-Insurance Report Downloader API

## 🚀 התחלה מהירה

### 1. התקנה
```bash
npm install apify-client
```

### 2. קוד בסיסי להפעלת ה-Actor עם OTP בזמן אמת

```javascript
import { ApifyClient } from 'apify-client';

// הגדרות
const API_TOKEN = '<YOUR_API_TOKEN>'; // החלף עם ה-token שלך
const ACTOR_ID = 'bulldog_adv~insurance-report-downloader';

// אתחול הלקוח
const client = new ApifyClient({
    token: API_TOKEN,
});

// פונקציה להורדת דוח ביטוח
async function downloadInsuranceReport() {
    // הגדרת הקלט
    const input = {
        mode: "single",
        provider: "yellin_lapidot", // או כל ספק אחר
        month: "2025-09",
        credentialsSource: "manual",
        id: "052677580",
        phone: "0546405432",
        agency: "אלעד עמרם",
        handleOtp: true
    };

    try {
        // הפעלת ה-Actor
        console.log('🚀 Starting Actor...');
        const run = await client.actor(ACTOR_ID).call(input, {
            waitForFinish: false // חשוב! לא לחכות לסיום
        });

        console.log(`✅ Actor started with Run ID: ${run.id}`);
        console.log(`📊 View in console: https://console.apify.com/actors/runs/${run.id}`);

        // מעקב אחרי הסטטוס
        await monitorActorRun(run.id);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// פונקציה למעקב אחרי ה-run וטיפול ב-OTP
async function monitorActorRun(runId) {
    let otpSent = false;
    let finished = false;

    while (!finished) {
        try {
            // קבלת סטטוס ה-run
            const run = await client.run(runId).get();
            
            // בדיקה אם הסתיים
            if (run.status === 'SUCCEEDED') {
                console.log('✅ Actor finished successfully!');
                await getResults(runId);
                finished = true;
                break;
            } else if (run.status === 'FAILED' || run.status === 'ABORTED') {
                console.error(`❌ Actor ${run.status}`);
                finished = true;
                break;
            }

            // בדיקה אם צריך OTP
            if (!otpSent) {
                const kvStore = client.run(runId).keyValueStore();
                
                // בדיקת כל הבקשות ל-OTP
                const keys = await kvStore.listKeys();
                const otpRequestKey = keys.items.find(key => key.key.startsWith('otp_request_'));
                
                if (otpRequestKey) {
                    const otpRequest = await kvStore.getRecord(otpRequestKey.key);
                    
                    if (otpRequest.value.status === 'waiting') {
                        console.log('\n📱 OTP REQUIRED!');
                        console.log(`Site: ${otpRequest.value.site}`);
                        console.log(`Phone ending: ${otpRequest.value.phone_last_digits}`);
                        
                        // כאן תציג dialog למשתמש להזין OTP
                        const userOtp = await getUserOtp(); // פונקציה שתממש
                        
                        // שליחת ה-OTP
                        await sendOtp(runId, otpRequest.value.job_id, otpRequest.value.site_id, userOtp);
                        otpSent = true;
                    }
                }
            }

            // המתנה לפני הבדיקה הבאה
            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
            console.error('Error monitoring:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

// פונקציה לשליחת OTP
async function sendOtp(runId, jobId, siteId, otp) {
    try {
        const kvStore = client.run(runId).keyValueStore();
        const otpKey = `otp_${jobId}_${siteId}`;
        
        console.log(`📤 Sending OTP: ${otp}`);
        
        await kvStore.setRecord(otpKey, {
            otp: otp,
            timestamp: new Date().toISOString()
        });
        
        console.log('✅ OTP sent successfully!');
        
    } catch (error) {
        console.error('❌ Failed to send OTP:', error);
    }
}

// פונקציה לקבלת התוצאות
async function getResults(runId) {
    try {
        // קבלת הקבצים שהורדו
        const kvStore = client.run(runId).keyValueStore();
        const keys = await kvStore.listKeys();
        
        console.log('\n📄 Downloaded files:');
        
        for (const key of keys.items) {
            if (key.key.includes('page') || key.key.includes('screenshot')) {
                // אלה screenshots, לא דוחות
                continue;
            }
            
            const record = await kvStore.getRecord(key.key);
            console.log(`- ${key.key}: ${record.contentType}`);
            
            // הורדת הקובץ
            // record.value מכיל את תוכן הקובץ
        }
        
        // או קבלת התוצאות מה-dataset
        const dataset = client.run(runId).dataset();
        const { items } = await dataset.listItems();
        
        if (items.length > 0) {
            console.log('\n📊 Results:');
            items.forEach(item => console.log(item));
        }
        
    } catch (error) {
        console.error('Error getting results:', error);
    }
}

// פונקציה דמה - תחליף בקוד אמיתי
async function getUserOtp() {
    // בעולם האמיתי - תציג dialog למשתמש
    // לדוגמה:
    // return await showOtpDialog();
    
    // לצורך הדוגמה:
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        readline.question('Enter OTP code: ', otp => {
            readline.close();
            resolve(otp);
        });
    });
}

// הפעלה
downloadInsuranceReport();
```

## 📱 דוגמה לאינטגרציה עם React/Vue/Angular

```javascript
// InsuranceService.js
export class InsuranceService {
    constructor(apiToken) {
        this.client = new ApifyClient({ token: apiToken });
        this.actorId = 'bulldog_adv~insurance-report-downloader';
    }

    async startDownload(credentials) {
        const run = await this.client.actor(this.actorId).call({
            mode: "single",
            provider: credentials.provider,
            month: credentials.month,
            credentialsSource: "manual",
            id: credentials.id,
            phone: credentials.phone,
            agency: credentials.agency,
            handleOtp: true
        }, { waitForFinish: false });

        return run.id;
    }

    async checkOtpNeeded(runId) {
        const kvStore = this.client.run(runId).keyValueStore();
        const keys = await kvStore.listKeys();
        
        for (const key of keys.items) {
            if (key.key.startsWith('otp_request_')) {
                const request = await kvStore.getRecord(key.key);
                if (request.value.status === 'waiting') {
                    return request.value;
                }
            }
        }
        
        return null;
    }

    async sendOtp(runId, jobId, siteId, otp) {
        const kvStore = this.client.run(runId).keyValueStore();
        const otpKey = `otp_${jobId}_${siteId}`;
        
        await kvStore.setRecord(otpKey, {
            otp: otp,
            timestamp: new Date().toISOString()
        });
    }

    async getRunStatus(runId) {
        return await this.client.run(runId).get();
    }

    async getResults(runId) {
        const dataset = this.client.run(runId).dataset();
        const { items } = await dataset.listItems();
        return items;
    }
}

// React Component Example
function InsuranceDownloader() {
    const [runId, setRunId] = useState(null);
    const [otpRequired, setOtpRequired] = useState(false);
    const [otpInfo, setOtpInfo] = useState(null);
    
    const service = new InsuranceService(API_TOKEN);
    
    const startDownload = async () => {
        const id = await service.startDownload({
            provider: 'yellin_lapidot',
            month: '2025-09',
            id: '052677580',
            phone: '0546405432',
            agency: 'אלעד עמרם'
        });
        
        setRunId(id);
        monitorRun(id);
    };
    
    const monitorRun = async (id) => {
        const interval = setInterval(async () => {
            const otpRequest = await service.checkOtpNeeded(id);
            
            if (otpRequest) {
                setOtpRequired(true);
                setOtpInfo(otpRequest);
                clearInterval(interval);
            }
            
            const status = await service.getRunStatus(id);
            if (status.status === 'SUCCEEDED' || status.status === 'FAILED') {
                clearInterval(interval);
                // Handle completion
            }
        }, 3000);
    };
    
    const handleOtpSubmit = async (otp) => {
        await service.sendOtp(runId, otpInfo.job_id, otpInfo.site_id, otp);
        setOtpRequired(false);
        monitorRun(runId); // Continue monitoring
    };
    
    return (
        <div>
            <button onClick={startDownload}>Start Download</button>
            
            {otpRequired && (
                <OtpDialog
                    site={otpInfo.site}
                    phoneDigits={otpInfo.phone_last_digits}
                    onSubmit={handleOtpSubmit}
                />
            )}
        </div>
    );
}
```

## 🔧 דוגמאות נוספות

### שימוש עם async/await פשוט
```javascript
const runId = await startActor();
const otp = await waitForOtpAndGetFromUser(runId);
await sendOtpToActor(runId, otp);
const results = await waitForResults(runId);
```

### שימוש עם Webhooks
```javascript
// הגדרת webhook שיודיע כשצריך OTP
const input = {
    // ... שאר הפרמטרים
    webhooks: [{
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
        requestUrl: 'https://your-server.com/webhook'
    }]
};
```

## 📝 הערות חשובות

1. **API Token** - שמור אותו בצורה מאובטחת, אל תחשוף אותו בקוד צד לקוח
2. **Rate Limits** - שים לב למגבלות ה-API של Apify
3. **Error Handling** - תמיד הוסף טיפול בשגיאות
4. **Timeout** - ה-OTP תקף ל-3 דקות

## 🆘 בעיות נפוצות

### הקוד לא מזהה OTP
- וודא שה-jobId וה-siteId נכונים
- בדוק שה-OTP נשלח למפתח הנכון

### ה-Actor נכשל
- בדוק את הלוגים ב-Apify Console
- וודא שהפרטים שהזנת נכונים

## 📞 תמיכה
לשאלות ובעיות - פתח issue ב-GitHub או צור קשר.
