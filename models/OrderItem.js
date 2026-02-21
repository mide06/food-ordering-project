const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  menuItemId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  },

  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },

  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

}, {
  timestamps: true,
});

module.exports = OrderItem;