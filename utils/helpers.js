const crypto = require('crypto');

function generateReference() {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `THR_${timestamp}_${random}`;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhoneNumber(phone) {
  // Nigerian phone number validation
  const phoneRegex = /^(\+234|234|0)?[789]\d{9}$/;
  return phoneRegex.test(phone);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
}

function calculateNextPayoutDate(startDate, frequency, currentWeek) {
  const start = new Date(startDate);
  const daysToAdd = frequency === 'weekly' ? (currentWeek * 7) : (currentWeek * 30);
  
  const nextPayout = new Date(start);
  nextPayout.setDate(start.getDate() + daysToAdd);
  
  return nextPayout;
}

module.exports = {
  generateReference,
  validateEmail,
  validatePhoneNumber,
  formatCurrency,
  calculateNextPayoutDate
};