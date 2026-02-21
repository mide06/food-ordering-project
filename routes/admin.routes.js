const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  getAllPayments,
  getRevenueSummary
} = require('../controllers/admin.controller');

router.get('/dashboard', getDashboardStats);
router.get('/orders', getAllOrdersAdmin);
router.patch('/orders/:id/status', updateOrderStatusAdmin);
router.get('/payments', getAllPayments);
router.get('/revenue', getRevenueSummary);

module.exports = router;