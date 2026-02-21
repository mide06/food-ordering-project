const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { Order } = require('../models');

// GET /api/orders/:id/qr
router.get('/orders/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const paymentUrl = `http://localhost:3000/pay.html?orderId=${order.id}`;
    const qr = await QRCode.toDataURL(paymentUrl);
    res.json({ qr, paymentUrl });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate QR', error: error.message });
  }
});

module.exports = router;
