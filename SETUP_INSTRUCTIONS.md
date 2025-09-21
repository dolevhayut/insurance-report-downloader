# הוראות הגדרת Apify Actor

## בעיה נוכחית
יש בעיה עם PATH אחרי שדרוג Node.js. הפתרון:

## פתרון 1: הפעלה ידנית ב-Apify Console

1. **היכנס ל-Apify Console**: https://console.apify.com/
2. **צור Actor חדש**: 
   - לחץ "Create new" → "Actor"
   - בחר "Custom" template
3. **העלה את הקבצים**:
   - העלה את כל הקבצים מתיקיית `apify/` ל-Actor
4. **הגדר משתני סביבה**:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. **שמור והפעל**

## פתרון 2: שימוש ב-CLI (אחרי תיקון PATH)

1. **תקן את PATH**:
   ```powershell
   # הוסף Node.js ל-PATH
   $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
   ```
2. **התקן Apify CLI**:
   ```bash
   npm install -g apify-cli
   ```
3. **התחבר**:
   ```bash
   apify login
   ```
4. **העלה Actor**:
   ```bash
   apify push
   ```

## פתרון 3: שימוש ב-npx (ללא התקנה גלובלית)

```bash
# התחברות
npx apify-cli@latest login

# העלאה
npx apify-cli@latest push
```

## קבצים נדרשים

כל הקבצים הבאים צריכים להיות ב-Actor:
- ✅ `actor.js` - הקוד הראשי
- ✅ `package.json` - תלויות
- ✅ `sites_config.json` - תצורת האתרים
- ✅ `actor.json` - תצורת Actor
- ✅ `input_schema.json` - סכמת קלט
- ✅ `Dockerfile` - תצורת Docker

## בדיקה מקומית

לבדיקה מקומית (אחרי תיקון PATH):
```bash
# התקן תלויות
npm install

# הרץ מקומית
npm start
```

## הערות חשובות

1. **משתני סביבה**: ודא שה-Supabase credentials מוגדרים נכון
2. **תצורת האתרים**: קובץ `sites_config.json` מכיל את הסלקטורים לכל פורטל
3. **Storage**: Actor מעלה דוחות ל-Supabase Storage bucket בשם `reports`

## תמיכה

אם יש בעיות:
1. בדוק את הלוגים ב-Apify Console
2. ודא שמשתני הסביבה מוגדרים נכון
3. בדוק שה-Supabase credentials תקינים
