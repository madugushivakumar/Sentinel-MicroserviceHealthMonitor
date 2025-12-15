# Notification Setup Guide

This guide explains how to configure real-time notifications to service owners when services go down or become degraded.

## Email Notifications

Email notifications are sent to:
1. Service owner email (from `ownerEmail` field in Service model)
2. Additional recipients configured in Alert Rules

### Configuration

Add these environment variables to your `.env` file:

```env
# Email Configuration (Required for email notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account → Security → 2-Step Verification
   - Click "App passwords"
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS`

### Other Email Providers

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

**Custom SMTP:**
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587
EMAIL_SECURE=false  # or true for port 465
EMAIL_USER=your-username
EMAIL_PASS=your-password
```

## Slack Notifications

### Option 1: Global Slack Webhook (All Services)

Add to `.env`:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Option 2: Per-Service Slack (via Alert Rules)

Configure in the Alert Rules UI for each service.

## Telegram Notifications

### Option 1: Global Telegram Bot (All Services)

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID (send a message to your bot, then visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`)

Add to `.env`:
```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

### Option 2: Per-Service Telegram (via Alert Rules)

Configure in the Alert Rules UI for each service.

## WhatsApp Notifications

Requires Meta Cloud API setup. Add to `.env`:
```env
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_CHAT_ID=recipient-phone-number
```

## How It Works

1. **Service Owner Email**: When you add a service, set the `ownerEmail` field. This person will receive email notifications automatically.

2. **Alert Rules**: Configure additional recipients and channels in the Alert Rules page:
   - Go to Services → Select a service → Alert Rules
   - Enable email notifications
   - Add recipient email addresses
   - Configure other channels (Slack, Telegram, WhatsApp)

3. **Automatic Notifications**: When a service goes DOWN or DEGRADED:
   - Email is sent to service owner + alert rule recipients
   - Other channels are used if configured
   - Notifications are throttled (max 1 per 5 minutes per service)

## Testing Notifications

1. **Test Email**: Set a service's `ownerEmail` and trigger a health check when the service is down
2. **Test via API**: Use the test alert endpoint (if available)
3. **Check Logs**: View alert logs in the Alerts page to see notification status

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables**: Ensure `EMAIL_USER` and `EMAIL_PASS` are set
2. **Check Service Owner Email**: Verify `ownerEmail` is set in the service
3. **Check Logs**: Look for email errors in backend console
4. **Test SMTP**: Try sending a test email manually with nodemailer
5. **Gmail Issues**: Make sure you're using an App Password, not your regular password

### Notifications Not Triggering

1. **Check Alert Rules**: Ensure alert rules are enabled
2. **Check Throttling**: Wait 5 minutes between alerts for the same service
3. **Check Service Status**: Notifications only trigger on 'down' or 'degraded' status
4. **Check Backend Logs**: Look for alert triggering messages

## Notification Content

Email notifications include:
- Service name and status
- Current latency, CPU, and memory usage
- Incident details (if any)
- Service URL
- Timestamp
- HTML formatted template with color-coded status

