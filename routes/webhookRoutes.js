const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// WhatsApp webhook verification
router.get('/', webhookController.verifyWebhook);

// WhatsApp webhook message handler
router.post('/', webhookController.handleMessage);

// Payment webhook handler
router.post('/payment', webhookController.handlePayment);

module.exports = router;