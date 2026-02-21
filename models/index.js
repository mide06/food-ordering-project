const sequelize = require('../config/db');

const MenuItem = require('./MenuItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Payment = require('./Payment');
const User = require('./User');

// Relationships

Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  onDelete: 'CASCADE',
});

OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
});

MenuItem.hasMany(OrderItem, {
  foreignKey: 'menuItemId',
  onDelete: 'CASCADE',
});

OrderItem.belongsTo(MenuItem, {
  foreignKey: 'menuItemId',
  onDelete: 'CASCADE',
});

// Payment relationships
Order.hasMany(Payment, {
  foreignKey: 'orderId',
  onDelete: 'CASCADE',
});

Payment.belongsTo(Order, {
  foreignKey: 'orderId',
});

module.exports = {
  sequelize,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  User,
};