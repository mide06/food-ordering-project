const { sequelize, Order, OrderItem, MenuItem } = require('../models');

exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    let { userId, items, deliveryAddress, customer } = req.body;
    
    // Use authenticated user if available, otherwise use provided userId or default to guest
    if (req.user) {
      userId = req.user.id;
    } else if (!userId) {
      userId = 1; // Default guest user
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain items' });
    }

    const orderNumber = 'ORD-' + Date.now(); // or use uuid for demo

    // Prepare customer information
    let customerName = null;
    let customerEmail = null;
    let customerNote = null;

    if (customer) {
      customerName = customer.name || null;
      customerEmail = customer.email || null;  
      customerNote = customer.note || null;
    }

    // If user is logged in, use their info as default
    if (req.user) {
      customerName = customerName || req.user.name;
      customerEmail = customerEmail || req.user.email;
    }

    const order = await Order.create(
      { 
        userId, 
        orderNumber, 
        totalAmount: 0, 
        deliveryAddress, 
        customerName,
        customerEmail,
        customerNote,
        status: 'pending' 
      },
      { transaction: t }
    );

    let totalAmount = 0;

    for (const item of items) {
      if (!item.quantity || item.quantity < 1) {
        throw new Error('Item quantity must be at least 1');
      }

      const menuItem = await MenuItem.findByPk(item.menuItemId);
      if (!menuItem || !menuItem.available) {
        throw new Error('Invalid or unavailable menu item');
      }

      const itemTotal = Number(menuItem.price) * Number(item.quantity);
      totalAmount += itemTotal;

      await OrderItem.create(
        {
          orderId: order.id,
          menuItemId: menuItem.id,
          quantity: item.quantity,
          unitPrice: menuItem.price,
        },
        { transaction: t }
      );
    }

    order.totalAmount = totalAmount;
    await order.save({ transaction: t });

    await t.commit();

    // Fetch full order with items for response
    const orderWithItems = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, include: [MenuItem] }]
    });

    return res.status(201).json({
      id: order.id
    });

  } catch (error) {
    console.error(error);
    await t.rollback();
    return res.status(500).json({ message: 'Order creation failed', error: error.message });
  }
};

// Add missing handlers to prevent route errors
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [{ model: OrderItem, include: [MenuItem] }]
    });
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, include: [MenuItem] }]
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch order details', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.json({ message: 'Order status updated', order });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};