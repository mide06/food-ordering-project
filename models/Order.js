const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },

  status: {
    type: DataTypes.ENUM(
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'delivered',
      'cancelled'
    ),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: {
        args: [['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']],
        msg: 'Status must be a valid order status.'
      }
    }
  },

  deliveryAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  customerNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

}, {
  timestamps: true,
});

module.exports = Order;