const crypto = require('crypto');
const logger = require('../utils/logger');
const messageHandler = require('../services/messageHandler');
const paymentService = require('../services/paymentService');

class WebhookController {
  // WhatsApp webhook verification
  async verifyWebhook(req, res) {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log("verifying webhook")

      if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        logger.info('WhatsApp webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        logger.warn('WhatsApp webhook verification failed');
        res.status(403).send('Verification failed');
      }
    } catch (error) {
      logger.error('Webhook verification error:', error);
      res.status(500).send('Internal server error');
    }
  }

  // Handle incoming WhatsApp messages
  async handleMessage(req, res) {
    try {
      const body = req.body;

      console.log("this is the body:", body);
      if (body.object === 'whatsapp_business_account') {
        if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
          const change = body.entry[0].changes[0];
          
          if (change.field === 'messages') {
            const value = change.value;
            
            if (value.messages && value.messages[0]) {
              const message = value.messages[0];
              const from = message.from;
              const messageBody = message.text ? message.text.body : '';
              
              logger.info(`Received message from ${from}: ${messageBody}`);
              
              // Process the message
              await messageHandler.processMessage(from, messageBody, message);
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Message handling error:', error);
      res.status(500).send('Internal server error');
    }
  }

  // Handle payment webhooks
  async handlePayment(req, res) {
    try {
      const hash = crypto
        .createHmac('sha512', process.env.PAYMENT_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      const signature = req.headers['x-paystack-signature'];

      if (hash !== signature) {
        logger.warn('Invalid payment webhook signature');
        return res.status(400).send('Invalid signature');
      }

      const event = req.body;
      logger.info('Payment webhook received:', event.event);

      await paymentService.processPaymentWebhook(event);

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Payment webhook error:', error);
      res.status(500).send('Internal server error');
    }
  }
}

module.exports = new WebhookController();