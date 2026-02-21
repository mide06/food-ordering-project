const express = require('express');
const router = express.Router();
const { getOrderDetails, getAllOrders, createOrder, updateOrderStatus } = require('../controllers/order.controller');
const { optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrderDetails); // ✅ This handles /api/orders/1
router.patch('/:id/status', updateOrderStatus); // ✅ This handles /api/orders/1/status
module.exports = router;