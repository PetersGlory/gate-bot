const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.baseURL = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
  }

  async sendMessage(to, text, options = {}) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: text
        }
      };

      const response = await axios.post(this.baseURL, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Message sent to ${to}: ${text.substring(0, 50)}...`);
      return response.data;
    } catch (error) {
      logger.error('WhatsApp send message error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendTemplate(to, templateName, components = []) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'en'
          },
          components: components
        }
      };

      const response = await axios.post(this.baseURL, payload, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`Template message sent to ${to}: ${templateName}`);
      return response.data;
    } catch (error) {
      logger.error('WhatsApp send template error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();