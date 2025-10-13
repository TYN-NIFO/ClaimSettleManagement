# Email Service Setup Guide

## Overview
The application supports two email providers:
1. **SendGrid API** (Recommended for production - more reliable on cloud platforms)
2. **SMTP/Gmail** (For development or if you prefer traditional SMTP)

The system automatically selects SendGrid if `SENDGRID_API_KEY` is configured, otherwise falls back to SMTP.

---

## Option 1: SendGrid Setup (Recommended for Render/Cloud)

### Why SendGrid?
- ✅ Works reliably on all cloud platforms (Render, AWS, Azure, etc.)
- ✅ No SMTP port blocking issues
- ✅ Better deliverability rates
- ✅ Free tier: 100 emails/day
- ✅ Better tracking and analytics

### Setup Steps:

#### 1. Create SendGrid Account
1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Sign up for a free account
3. Verify your email address

#### 2. Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it: `claim-app-production`
4. Select "Full Access" or "Restricted Access" with Mail Send permission
5. Copy the API key (you won't see it again!)

#### 3. Verify Sender Email (Important!)
1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in details:
   - From Name: `The Yellow Network Claims`
   - From Email: `info@theyellownetwork.com`
   - Reply To: (same as from email or support email)
4. Check your email and click verification link

#### 4. Configure Environment Variables

**On Render Dashboard:**
- Go to your service → Environment tab
- Add these variables:
  ```
  SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  EMAIL_FROM=info@theyellownetwork.com
  FRONTEND_URL=https://claim-settle-management-gyjm.vercel.app
  ```

**In local `config.env`:**
```env
# SendGrid Configuration (Recommended for Production)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=info@theyellownetwork.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### 5. Deploy
- Commit and push changes
- Render will automatically redeploy
- Test the forgot password feature

---

## Option 2: SMTP/Gmail Setup (Development Only)

### Setup Steps:

#### 1. Enable 2-Factor Authentication on Gmail
1. Go to your Google Account settings
2. Enable 2-Factor Authentication

#### 2. Generate App Password
1. Go to Google Account → Security → 2-Step Verification → App passwords
2. Select "Mail" and "Other (Custom name)"
3. Name it: "Claim App"
4. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

#### 3. Configure Environment Variables

**In `config.env`:**
```env
# SMTP Configuration (Development or if SendGrid not available)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=innovation@theyellow.network
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=info@theyellownetwork.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

⚠️ **Note:** SMTP (especially port 587 and 465) is often blocked on cloud platforms like Render, AWS, Azure. Use SendGrid for production.

---

## Testing

### Local Testing:
```bash
cd backend
npm install @sendgrid/mail  # If using SendGrid
npm run dev
```

### Test Forgot Password Flow:
1. Go to `http://localhost:3000/login`
2. Click "Forgot your password?"
3. Enter a registered email
4. Check email inbox (and spam folder)
5. Click the reset link
6. Enter new password
7. Log in with new password

### Check Logs:
The enhanced logging will show:
```
📧 Using SendGrid Email Service
✅ SendGrid Email Service initialized successfully
📧 Attempting to send password reset email via SendGrid
✅ Password reset email sent successfully via SendGrid
```

Or if using SMTP:
```
📧 Using SMTP Email Service
📧 Initializing Email Service with config
✅ Email service is ready to send messages
📧 Attempting to send password reset email
✅ Password reset email sent successfully
```

---

## Troubleshooting

### SendGrid Issues:

**"Sender email not verified"**
- Go to SendGrid → Settings → Sender Authentication
- Verify your sender email address
- Wait for verification email and click the link

**"API key invalid"**
- Regenerate API key in SendGrid dashboard
- Make sure you copied it correctly (starts with `SG.`)
- Update environment variable and redeploy

**"Email not arriving"**
- Check spam folder
- Verify sender email is verified in SendGrid
- Check SendGrid → Activity Feed for delivery status

### SMTP Issues:

**"Connection timeout"**
- Port 587/465 is blocked by your cloud provider
- Switch to SendGrid instead
- Or contact your cloud provider to whitelist SMTP ports

**"Invalid credentials"**
- Regenerate app password in Google Account
- Make sure 2FA is enabled
- Copy password without spaces

**"Authentication failed"**
- Double-check SMTP_USER and SMTP_PASS
- Use app password, not regular Gmail password

---

## Production Checklist

✅ SendGrid account created and verified  
✅ API key generated and securely stored  
✅ Sender email verified in SendGrid  
✅ Environment variables configured on Render  
✅ `FRONTEND_URL` set to production URL  
✅ Test email sending in production  
✅ Check email deliverability (inbox, not spam)  
✅ Monitor SendGrid Activity Feed for issues  
✅ Set up email alerts in SendGrid dashboard  

---

## Cost Comparison

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| **SendGrid** | 100 emails/day | $19.95/month for 50K emails |
| **Gmail SMTP** | ~500 emails/day | Subject to Gmail limits |

For production apps, SendGrid provides better deliverability and reliability.

---

## Support

- SendGrid Docs: https://docs.sendgrid.com
- Gmail SMTP: https://support.google.com/mail/answer/7126229
- Issues: Check backend logs for detailed error messages

