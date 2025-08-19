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
Add new message handlers in `services/messageHandler.js`:

```javascript
// In handleMessage method, add new command
else if (command.startsWith('/your_command')) {
  await this.handleYourCommand(from, messageBody, user);
}

// Add the handler method
async handleYourCommand(from, messageBody, user) {
  // Your custom logic here
  await whatsappService.sendMessage(from, "Your response");
}
```

### Different Payment Providers
Modify `services/paymentService.js` to integrate with other providers like Flutterwave, Stripe, etc.

### Custom Rotation Logic
Edit `services/rotationService.js` to implement different rotation algorithms (random, priority-based, etc.).

## 📚 API Documentation

### Webhook Endpoints

#### WhatsApp Webhook
```
GET  /webhook - Verify webhook with WhatsApp
POST /webhook - Receive WhatsApp messages
```

#### Payment Webhook  
```
POST /webhook/payment - Process payment confirmations
```

#### Health Check
```
GET /health - Server status and uptime
```

### Database Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  whatsappId: "2347012345678",
  phoneNumber: "+2347012345678", 
  name: "John Doe",
  email: "john@email.com",
  bankDetails: {
    accountNumber: "1234567890",
    bankName: "Access Bank",
    accountName: "JOHN DOE"
  },
  groups: [ObjectId],
  balance: 50000,
  isActive: true,
  registeredAt: Date,
  lastActivity: Date
}
```

#### Groups Collection
```javascript
{
  _id: ObjectId,
  name: "Office Savings",
  description: "Monthly office thrift",
  contributionAmount: 10000,
  frequency: "weekly",
  maxMembers: 12,
  members: [{
    user: ObjectId,
    joinedAt: Date,
    isActive: true
  }],
  creator: ObjectId,
  currentCycle: 1,
  startDate: Date,
  isActive: true,
  totalContributions: 120000
}
```

#### Contributions Collection
```javascript
{
  _id: ObjectId,
  user: ObjectId,
  group: ObjectId,
  amount: 10000,
  cycle: 1,
  week: 3,
  transactionReference: "THR_1699123456_A1B2",
  paymentMethod: "bank_transfer",
  status: "confirmed",
  paidAt: Date,
  createdAt: Date
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. WhatsApp Messages Not Received
```bash
# Check webhook URL is accessible
curl https://yourdomain.com/webhook

# Verify WhatsApp webhook subscription
# Check Facebook Developer Console logs

# Ensure SSL certificate is valid
openssl s_client -connect yourdomain.com:443
```

#### 2. Payment Webhooks Failing
```bash
# Check Paystack webhook logs in dashboard
# Verify webhook signature validation
# Test webhook endpoint manually:

curl -X POST https://yourdomain.com/webhook/payment \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: test" \
  -d '{"event":"charge.success","data":{"reference":"test"}}'
```

#### 3. Database Connection Issues
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongosh "mongodb://localhost:27017/whatsapp-thrift-bot"

# For MongoDB Atlas, check IP whitelist and connection string
```

#### 4. Bot Not Responding
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs thrift-bot

# Restart bot
pm2 restart thrift-bot
```

### Debug Mode

Enable detailed logging by setting `LOG_LEVEL=debug` in your `.env` file:

```env
LOG_LEVEL=debug
```

## 🔍 Testing Guide

### Manual Testing Checklist

#### User Registration
- [ ] Send `/start` command
- [ ] Register with `/register John Doe john@email.com`
- [ ] Check `/profile` shows correct info
- [ ] Verify user created in database

#### Group Management
- [ ] Create group with `/create_group TestGroup 5000 5`
- [ ] Join group with group ID
- [ ] List groups with `/groups`
- [ ] Check group info with database

#### Contributions
- [ ] Make contribution with `/contribute GROUP_ID 5000`
- [ ] Receive bank details
- [ ] Simulate payment webhook
- [ ] Verify contribution confirmed
- [ ] Check payout processed when all members contribute

### Automated Testing

```javascript
// tests/integration.test.js
const request = require('supertest');
const app = require('../server');

describe('Webhook Endpoints', () => {
  test('WhatsApp webhook verification', async () => {
    const response = await request(app)
      .get('/webhook')
      .query({
        'hub.mode': 'subscribe',
        'hub.verify_token': process.env.WHATSAPP_VERIFY_TOKEN,
        'hub.challenge': 'test_challenge'
      });
    
    expect(response.status).toBe(200);
    expect(response.text).toBe('test_challenge');
  });

  test('Health check endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});
```

Run tests:
```bash
npm test
```

## 📈 Performance Optimization

### Database Optimization
```javascript
// Add indexes for better query performance
// In MongoDB shell:

// User queries
db.users.createIndex({ "whatsappId": 1 })
db.users.createIndex({ "email": 1 })

// Contribution queries
db.contributions.createIndex({ 
  "user": 1, "group": 1, "cycle": 1, "week": 1 
})

// Transaction queries
db.transactions.createIndex({ "reference": 1 })
db.transactions.createIndex({ "user": 1, "createdAt": -1 })
```

### Rate Limiting Configuration
```javascript
// Adjust rate limiting in server.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increase for high-traffic bots
  message: "Too many requests, please try again later"
});
```

### Caching Strategy
```javascript
// Add Redis for session caching (optional)
const redis = require('redis');
const client = redis.createClient();

// Cache user sessions
async function getCachedUser(whatsappId) {
  const cached = await client.get(`user:${whatsappId}`);
  return cached ? JSON.parse(cached) : null;
}
```

## 🌍 Multi-Country Support

### Currency Configuration
```javascript
// utils/currency.js
const currencies = {
  'NG': { code: 'NGN', symbol: '₦' },
  'GH': { code: 'GHS', symbol: '₵' },
  'KE': { code: 'KES', symbol: 'KSh' }
};

function formatCurrency(amount, country = 'NG') {
  const currency = currencies[country];
  return new Intl.NumberFormat(`en-${country}`, {
    style: 'currency',
    currency: currency.code
  }).format(amount);
}
```

### Payment Provider Integration
```javascript
// services/paymentProviders/
├── paystack.js      // Nigeria
├── flutterwave.js   // Multi-country
├── stripe.js        // Global
└── factory.js       // Provider selection logic
```

## 🚀 Advanced Features

### Analytics Dashboard
Create a web dashboard to view:
- Total contributions per group
- User activity statistics  
- Payment success rates
- Group performance metrics

### SMS Notifications
Integrate with SMS providers for backup notifications:
```javascript
// services/smsService.js
const twilio = require('twilio');

class SMSService {
  async sendSMS(phoneNumber, message) {
    // Implementation
  }
}
```

### Multi-language Support
```javascript
// utils/localization.js
const messages = {
  en: {
    welcome: "Welcome to Thrift Bot!",
    contribution_confirmed: "Contribution confirmed!"
  },
  yo: {
    welcome: "Ku abo si Thrift Bot!",
    contribution_confirmed: "Ifasilẹ ti wa ni idanimo!"
  }
};
```

## 📞 Support & Community

### Getting Help
- **Documentation**: Check this README first
- **Issues**: Create GitHub issues for bugs
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@yourcompany.com

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Roadmap
- [ ] Web dashboard for group management
- [ ] Mobile app companion
- [ ] Multi-currency support
- [ ] Smart contracts integration
- [ ] AI-powered financial insights
- [ ] Voice message support
- [ ] Group chat features
- [ ] Loan management system

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Important Notes

### Security Reminders
- **Never commit `.env` files** to version control
- **Use strong JWT secrets** (minimum 32 characters)
- **Enable 2FA** on all service accounts (Facebook, Paystack, etc.)
- **Regularly rotate API keys** and webhook secrets
- **Monitor logs** for suspicious activity

### Legal Compliance
- Ensure compliance with local financial regulations
- Implement proper KYC (Know Your Customer) procedures
- Maintain audit trails for all transactions
- Consider data privacy laws (GDPR, etc.)

### Production Checklist
- [ ] SSL certificate configured and auto-renewing
- [ ] Database backups scheduled
- [ ] Monitoring and alerting set up
- [ ] Rate limiting properly configured
- [ ] Error tracking implemented
- [ ] Load balancing for high traffic
- [ ] Security headers configured
- [ ] API rate limits respected

---

**Built with ❤️ for the African fintech ecosystem**

*This bot helps communities save money together through automated thrift management. Perfect for workplaces, families, and community groups who want to pool resources and support each other financially.*