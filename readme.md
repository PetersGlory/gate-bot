# README.md
# 💬💰 WhatsApp Thrift Bot

A fully automated WhatsApp bot that manages thrift (ajo/esusu) contributions and payouts using Node.js, MongoDB, and WhatsApp Business API. Built for savings groups to automate deposits, withdrawals, contribution tracking, group management, and rotation logic — all via WhatsApp chat.

## ✨ Key Features

- ✅ **User Registration & Authentication** via WhatsApp
- 👥 **Complete Group Management** - Create, join, and manage thrift circles
- 💵 **Automated Deposit Handling** with real bank details integration
- 🧾 **Contribution Tracking** per cycle and user with MongoDB
- 🔄 **Automatic Weekly Rotation Logic** with fair turn-taking
- 💸 **Smart Payout System** with bank transfer integration
- 🛡️ **Security** - JWT tokens, rate limiting, webhook verification
- 📱 **Real WhatsApp Integration** - Works with actual WhatsApp Business API
- 📊 **Transaction History & Reporting** with detailed analytics
- 🔔 **Smart Notifications** and automatic reminders

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- MongoDB (local or cloud)
- WhatsApp Business API access
- Paystack account (for Nigerian payments)
- SSL certificate for webhooks

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd whatsapp-thrift-bot
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Critical configurations needed:**

```env
# Get from WhatsApp Business API
WHATSAPP_TOKEN=your_permanent_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token

# Database
MONGODB_URI=mongodb://localhost:27017/whatsapp-thrift-bot

# Payments (Paystack for Nigeria)
PAYSTACK_SECRET_KEY=sk_live_your_key_here
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your_super_secret_key_minimum_32_characters
```

### 3. WhatsApp Business API Setup

**Step-by-step WhatsApp setup:**

1. **Facebook Business Account**: Create at business.facebook.com
2. **WhatsApp Business API**: Go to developers.facebook.com
3. **Create App**: Choose "Business" type
4. **Add WhatsApp Product**: Enable WhatsApp Business API
5. **Get Phone Number**: Add and verify your business phone number
6. **Get Tokens**:
   - Temporary token (24h) for testing
   - Permanent token for production
7. **Webhook Setup**:
   - URL: `https://yourdomain.com/webhook`
   - Verify token: Match your `.env` file
   - Subscribe to `messages` field

### 4. Paystack Setup (Nigeria)

1. Create account at paystack.com
2. Get API keys from Settings → API Keys & Webhooks
3. Configure webhook URL: `https://yourdomain.com/webhook/payment`
4. Enable events: `charge.success`, `transfer.success`

### 5. Database Setup

```bash
# Start MongoDB locally
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your connection string
```

### 6. Start the Bot

```bash
# Development
npm run dev

# Production
npm start
```

## 📱 WhatsApp Commands Reference

### **Getting Started**
```
/start - Welcome and bot introduction
/register John Doe john@email.com - Register your account
/help - Show all available commands
/profile - View your account details
```

### **Group Management**
```
/create_group MyGroup 5000 10 - Create group (name, amount, max members)
/join_group <group_id> - Join existing group
/groups - List all your groups
/group_info <group_id> - Get detailed group information
```

### **Making Contributions**
```
/contribute <group_id> <amount> - Make weekly contribution
/balance - Check your current balance
/transactions - View recent transactions
```

### **Status & Information**
```
/status - Check bot and system status
/rotation <group_id> - Check current rotation schedule
```

## 🏗️ Architecture Overview

```
WhatsApp Message → Webhook → Message Handler → Service Layer → Database
                                     ↓
Payment Provider ← Payment Service ← Business Logic ← MongoDB Models
```

## 💳 Payment Flow

1. **Contribution Request**: User sends `/contribute GROUP_ID AMOUNT`
2. **Bank Details Generation**: Bot responds with unique bank details
3. **User Payment**: User transfers money to provided account
4. **Webhook Confirmation**: Paystack confirms payment via webhook
5. **Auto-Processing**: System confirms contribution and triggers payout logic
6. **Payout Distribution**: Weekly recipient receives automatic bank transfer

## 📊 Database Models

- **User**: WhatsApp ID, profile, bank details, groups
- **Group**: Name, contribution amount, members, cycles
- **Contribution**: User contributions per cycle/week
- **Rotation**: Weekly payout tracking and recipient management
- **Transaction**: All financial activities with complete audit trail

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Webhook Verification**: Cryptographic signature validation
- **JWT Authentication**: Secure session management
- **Input Validation**: All user inputs sanitized
- **CORS Protection**: Proper cross-origin security
- **Helmet Security**: HTTP security headers

## 🚀 Production Deployment

### Recommended Stack

- **Server**: DigitalOcean Droplet, AWS EC2, or similar
- **Database**: MongoDB Atlas (cloud) or self-hosted
- **SSL**: Let's Encrypt (free) or CloudFlare
- **Domain**: Any domain provider
- **Monitoring**: PM2 for process management

### Deployment Steps

1. **Server Setup**:
```bash
# Ubuntu 20.04+
sudo apt update
sudo apt install nodejs npm nginx certbot
```

2. **SSL Certificate**:
```bash
# Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

3. **Process Management**:
```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start server.js --name thrift-bot
pm2 startup
pm2 save
```

4. **Nginx Configuration**:
```nginx
server {
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Test WhatsApp webhook
curl -X POST https://yourdomain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account"}'
```

## 📈 Monitoring & Analytics

- **Logs**: Winston logging to files and console
- **Health Check**: `/health` endpoint for uptime monitoring
- **Transaction Analytics**: Built-in reporting via WhatsApp commands
- **Error Tracking**: Comprehensive error logging and handling

## 🔧 Customization

### Adding New Banks
Edit `services/paymentService.js` and add bank codes to `getBankCode()` method.

### Custom Commands
Add new message handlers in `services/messageHandler