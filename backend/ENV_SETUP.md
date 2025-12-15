# Environment Variables Setup

Create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://isha4shiva_db_user:KFWa7AceeiwND8VA@cluster0.nypeof3.mongodb.net/sentinel?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Alert Integrations (optional)
# Email notifications - REQUIRED for service owner notifications
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password  # Use Gmail App Password, not regular password

# Slack notifications (optional)
SLACK_WEBHOOK_URL=

# Telegram notifications (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# WhatsApp notifications (optional)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_CHAT_ID=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Quick Setup

1. Copy the MongoDB URI above
2. Create `.env` file in `backend/` directory
3. Paste the configuration
4. Update `JWT_SECRET` with a secure random string for production

## MongoDB Connection

Your MongoDB Atlas connection string is configured. Make sure:
- The database name is `sentinel` (or update the connection string)
- Your IP address is whitelisted in MongoDB Atlas
- The user has proper read/write permissions

## Email Notifications Setup

**Important**: Email notifications are sent to service owners automatically when services go down.

### Gmail Setup (Recommended)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and generate a password
   - Use this password in `EMAIL_PASS` (not your regular password)

3. Add to `.env`:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

### Other Email Providers

- **Outlook**: `EMAIL_HOST=smtp-mail.outlook.com`
- **SendGrid**: `EMAIL_HOST=smtp.sendgrid.net`, `EMAIL_USER=apikey`, `EMAIL_PASS=your-api-key`
- **Custom SMTP**: Set `EMAIL_HOST`, `EMAIL_PORT`, and credentials

See `NOTIFICATION_SETUP.md` for detailed notification configuration.

