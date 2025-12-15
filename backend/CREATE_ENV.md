# Create .env File

## Quick Setup

1. Navigate to the `backend` directory
2. Create a file named `.env` (no extension, just `.env`)
3. Copy and paste the following content:

```env
PORT=5000
MONGODB_URI=mongodb+srv://isha4shiva_db_user:KFWa7AceeiwND8VA@cluster0.nypeof3.mongodb.net/sentinel?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Alert Integrations (optional)
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Windows PowerShell

```powershell
cd backend
New-Item -Path .env -ItemType File
# Then open .env in your editor and paste the content above
```

## Windows CMD

```cmd
cd backend
type nul > .env
# Then open .env in your editor and paste the content above
```

## Linux/Mac

```bash
cd backend
touch .env
# Then open .env in your editor and paste the content above
```

## Verify

After creating the file, restart your server. You should see:
- ✅ MongoDB Connected: cluster0.nypeof3.mongodb.net
- 🚀 Server running on port 5000

If you see errors, check:
1. The `.env` file is in the `backend/` directory
2. The file is named exactly `.env` (not `.env.txt`)
3. The MongoDB URI is correct and your IP is whitelisted in MongoDB Atlas

