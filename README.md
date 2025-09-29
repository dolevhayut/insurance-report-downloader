# Insurance Report Downloader

An Apify Actor that automates downloading commission reports from Israeli insurance company portals.

## Features

- Supports 19+ insurance companies
- Handles OTP authentication
- Flexible credential management
- Single provider or batch processing
- Automatic report upload to Supabase Storage

## Usage Modes

### 1. Single Provider Mode

Run a specific insurance provider with manual credentials:

```json
{
  "mode": "single",
  "provider": "ayalon",
  "credentialsSource": "manual",
  "credentials": {
    "username": "your_username",
    "password": "your_password"
  },
  "month": "2024-12",
  "handleOtp": true
}
```

### 2. Single Provider with Mapping File

Use pre-configured credentials from `credentials_mapping.json`:

```json
{
  "mode": "single",
  "provider": "migdal",
  "credentialsSource": "mapping",
  "month": "2024-12",
  "handleOtp": true
}
```

### 3. Single Provider with Supabase Credentials

Use credentials stored in Supabase database:

```json
{
  "mode": "single",
  "provider": "clal",
  "credentialsSource": "supabase",
  "userId": "your-supabase-user-id",
  "month": "2024-12",
  "handleOtp": true
}
```

### 4. All Providers Mode

Process all pending jobs from Supabase:

```json
{
  "mode": "all",
  "userId": "your-supabase-user-id",
  "month": "2024-12"
}
```

## Supported Providers

| Provider ID | Company Name | Special Requirements |
|------------|--------------|---------------------|
| ayalon | איילון | OTP |
| migdal | מגדל | OTP |
| altshuler_shaham | אלטשולר שחם | License + ID + OTP |
| yellin_lapidot | ילין לפידות | ID + Phone + Agency + OTP |
| clal | כלל ביטוח | - |
| passportcard | פספורט קארד | OTP |
| fnx | Fnx | OTP |
| harel | הראל ביטוח | OTP |
| menorah | מנורה מבטחים | OTP |
| phoenix | פניקס ביטוח | OTP |
| direct | דיירקט ביטוח | OTP |
| shirbit | שירביט ביטוח | OTP |
| hasneh | הסנה ביטוח | OTP |
| yashir | ישיר ביטוח | OTP |
| halachmi | חלכמי ביטוח | OTP |
| gadish | גדיש ביטוח | OTP |
| shoham | שוהם ביטוח | OTP |
| ariel | אריאל ביטוח | OTP |
| binah | בינה ביטוח | OTP |

## Credential Fields

Different providers require different credential fields:

### Standard (username/password):
```json
{
  "username": "agent_number",
  "password": "password"
}
```

### Altshuler Shaham:
```json
{
  "license": "00130639",
  "id": "011178852"
}
```

### Yellin Lapidot:
```json
{
  "id": "052677580",
  "phone": "0546405432",
  "agency": "אלעד עמרם"
}
```

## OTP Handling

When OTP is required:
1. The actor will pause and wait for input
2. In single mode: Enter the OTP in the Apify console
3. In all mode: Submit OTP through your application's UI

## Credentials Mapping File

Create a `credentials_mapping.json` file (git-ignored):

```json
{
  "credentials": {
    "ayalon": {
      "username": "your_username",
      "password": "your_password"
    },
    "migdal": {
      "username": "your_username",
      "password": "your_password"
    }
  }
}
```

## Environment Variables

Required for Supabase integration:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Development

1. Install dependencies:
```bash
npm install
```

2. Test locally:
```bash
npm start
```

3. Deploy to Apify:
```bash
apify push
```

## Notes

- Reports are saved in Excel format (.xlsx)
- Files are uploaded to Supabase Storage bucket named 'reports'
- Temporary jobs (single mode) don't update the database
- Set `handleOtp: false` to skip OTP-protected sites
