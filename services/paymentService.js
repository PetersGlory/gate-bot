const axios = require('axios');
const Transaction = require('../models/Transaction');
const { generateReference } = require('../utils/helpers');
const logger = require('../utils/logger');

class PaymentService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseURL = 'https://api.paystack.co';
  }

  async processPaymentWebhook(event) {
    try {
      if (event.event === 'charge.success') {
        const reference = event.data.reference;
        const amount = event.data.amount / 100; // Paystack amounts are in kobo

        // Find and confirm the contribution
        const thriftService = require('./thriftService');
        const result = await thriftService.confirmContribution(reference);

        if (result.success) {
          logger.info(`Payment confirmed for reference: ${reference}`);
          
          // Notify user via WhatsApp
          const whatsappService = require('./whatsappService');
          const Contribution = require('../models/Contribution');
          
          const contribution = await Contribution.findOne({ 
            transactionReference: reference 
          }).populate('user group');

          if (contribution) {
            await whatsappService.sendMessage(
              contribution.user.whatsappId,
              result.message
            );
          }
        }
      }
    } catch (error) {
      logger.error('Payment webhook processing error:', error);
    }
  }

  async initiatePayout(user, amount, description) {
    try {
      if (!user.bankDetails || !user.bankDetails.accountNumber) {
        return { 
          success: false, 
          error: 'User bank details not found' 
        };
      }

      const reference = generateReference();
      
      // Create recipient on Paystack (if not exists)
      const recipientData = {
        type: 'nuban',
        name: user.bankDetails.accountName || user.name,
        account_number: user.bankDetails.accountNumber,
        bank_code: this.getBankCode(user.bankDetails.bankName),
        currency: 'NGN'
      };

      const recipientResponse = await axios.post(
        `${this.baseURL}/transferrecipient`,
        recipientData,
        {
          headers: {
            'Authorization': `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!recipientResponse.data.status) {
        return { success: false, error: 'Failed to create transfer recipient' };
      }

      const recipientCode = recipientResponse.data.data.recipient_code;

      // Initiate transfer
      const transferData = {
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: recipientCode,
        reason: description,
        reference: reference
      };

      const transferResponse = await axios.post(
        `${this.baseURL}/transfer`,
        transferData,
        {
          headers: {
            'Authorization': `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (transferResponse.data.status) {
        // Create transaction record
        const transaction = new Transaction({
          user: user._id,
          amount: amount,
          type: 'payout',
          reference: reference,
          description: description,
          status: 'completed',
          metadata: {
            transfer_code: transferResponse.data.data.transfer_code
          }
        });

        await transaction.save();

        return {
          success: true,
          reference: reference,
          transferCode: transferResponse.data.data.transfer_code
        };
      } else {
        return { 
          success: false, 
          error: transferResponse.data.message || 'Transfer failed' 
        };
      }

    } catch (error) {
      logger.error('Payout initiation error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  getBankCode(bankName) {
    // Map of Nigerian bank names to their codes
    const bankCodes = {
      'Access Bank': '044',
      'Citibank': '023',
      'Diamond Bank': '063',
      'Dynamic Standard Bank': '408',
      'Ecobank Nigeria': '050',
      'Fidelity Bank Nigeria': '070',
      'First Bank of Nigeria': '011',
      'First City Monument Bank': '214',
      'Guaranty Trust Bank': '058',
      'Heritage Bank Plc': '030',
      'Jaiz Bank': '301',
      'Keystone Bank Limited': '082',
      'Providus Bank Plc': '101',
      'Polaris Bank': '076',
      'Stanbic IBTC Bank Nigeria Limited': '221',
      'Standard Chartered Bank': '068',
      'Sterling Bank': '232',
      'Suntrust Bank Nigeria Limited': '100',
      'Union Bank of Nigeria': '032',
      'United Bank for Africa': '033',
      'Unity Bank Plc': '215',
      'Wema Bank': '035',
      'Zenith Bank': '057'
    };

    return bankCodes[bankName] || '011'; // Default to First Bank
  }
}

module.exports = new PaymentService();