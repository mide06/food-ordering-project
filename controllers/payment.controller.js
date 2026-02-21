const { Payment, Order } = require('../models');
const QRCode = require('qrcode');

/**
 * Initiate Payment and generate QR code
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    // 1️⃣ Validate order
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ message: 'Order cannot be paid' });

    // 2️⃣ Generate unique reference
    const reference = 'PAY-' + Date.now();

    // 3️⃣ Create payment record
    const payment = await Payment.create({
      orderId,
      amount: order.totalAmount,
      paymentMethod,
      reference,
    });

    // 4️⃣ Generate QR code for mock payment URL
    const qrData = await QRCode.toDataURL(`http://localhost:3000/api/payments/mock-success?ref=${reference}`);

    return res.status(201).json({
      message: 'Payment initiated',
      payment: {
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        qrCode: qrData
      }
    });

  } catch (error) {
    return res.status(500).json({ message: 'Payment initiation failed', error: error.message });
  }
};

/**
 * Mock Payment Success
 * Simulates payment provider callback
 */
exports.mockPaymentSuccess = async (req, res) => {
  try {
    const { ref } = req.query;

    const payment = await Payment.findOne({ where: { reference: ref } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // 1️⃣ Update payment status
    payment.status = 'successful';
    await payment.save();

    // 2️⃣ Update associated order status with safe transition
    const order = await Order.findByPk(payment.orderId);
    const validTransitions = {
      pending: ['confirmed'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['delivered'],
      delivered: [],
      cancelled: []
    };
    // Only allow transition if valid
    if (validTransitions[order.status] && validTransitions[order.status].includes('confirmed')) {
      order.status = 'confirmed';
      await order.save();
      // Optionally log status change here
    }

    return res.json({
      message: 'Payment successful',
      orderId: order.id,
      paymentRef: payment.reference,
      orderStatus: order.status
    });

  } catch (error) {
    return res.status(500).json({ message: 'Mock payment failed', error: error.message });
  }
};