# הוראות להזנת OTP בזמן אמת

## כאשר ה-Actor מבקש OTP

כשתראה בלוגים הודעה כזו:
```
=== OTP REQUIRED ===
Please enter the OTP code for ילין לפידות:
You have 3 minutes to add "otp" field to the input in Apify Console
Go to Input tab and add: {"otp": "YOUR_CODE_HERE"}
```

## צעדים להזנת הקוד:

### 1. **פתח את Apify Console**
- היכנס ל-Run הפעיל של ה-Actor

### 2. **עבור ללשונית Input**
- לחץ על הטאב "Input" בממשק

### 3. **הוסף את שדה ה-OTP**
בתוך ה-JSON, הוסף שורה חדשה:
```json
{
  "mode": "single",
  "provider": "yellin_lapidot",
  // ... שאר השדות
  "otp": "123456"  // <- הוסף את השורה הזו עם הקוד שקיבלת
}
```

### 4. **שמור את השינוי**
- לחץ על כפתור "Save" או "Update"

### 5. **ה-Actor ימשיך אוטומטית**
- הקוד בודק כל 5 שניות אם הוזן OTP
- ברגע שיזהה את הקוד, ימשיך בתהליך

## זמנים חשובים:
- **זמן המתנה מקסימלי**: 3 דקות
- **תדירות בדיקה**: כל 5 שניות
- **הודעת תזכורת**: כל 30 שניות

## טיפים:
1. הכן את חלון Apify Console מראש
2. העתק את הקוד מה-SMS לפני שתתחיל
3. ודא שאתה בטאב הנכון (Input)
4. שים לב לפסיקים ב-JSON

## דוגמה מלאה:
```json
{
  "mode": "single",
  "provider": "yellin_lapidot",
  "credentialsSource": "manual",
  "id": "052677580",
  "phone": "0546405432",
  "agency": "אלעד עמרם",
  "month": "2024-12",
  "handleOtp": true,
  "otp": "419587"  // הקוד שהוספת
}
```
