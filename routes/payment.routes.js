const express = require('express');
const router = express.Router();
const { initiatePayment, mockPaymentSuccess } = require('../controllers/payment.controller');

router.post('/initiate', initiatePayment);
router.get('/mock-success', mockPaymentSuccess);

module.exports = router;