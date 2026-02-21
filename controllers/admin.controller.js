const { Order, OrderItem, MenuItem, Payment, sequelize } = require('../models');
const { Op } = require('sequelize');


// 1️⃣ Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('Getting dashboard stats...');
    
    const totalOrders = await Order.count();
    console.log('Total orders:', totalOrders);
    
    const totalPayments = await Payment.count();
    console.log('Total payments:', totalPayments);
    
    const totalRevenue = await Payment.sum('amount', {
      where: { status: 'successful' }
    });
    console.log('Total revenue:', totalRevenue);

    const result = {
      totalOrders,
      totalPayments,
      totalRevenue: totalRevenue || 0
    };

    console.log('Sending dashboard stats:', result);
    res.json(result);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: error.message });
  }
};


// 2️⃣ View All Orders (Admin View)
exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: OrderItem,
          include: [MenuItem]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 3️⃣ Update Order Status
exports.updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order updated successfully', order });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 4️⃣ View All Payments
exports.getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [Order],
      order: [['createdAt', 'DESC']]
    });

    res.json(payments);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// 5️⃣ Revenue Summary
exports.getRevenueSummary = async (req, res) => {
  try {
    const revenueByDay = await Payment.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: { status: 'successful' },
      group: ['date'],
      order: [['date', 'DESC']]
    });

    res.json(revenueByDay);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};