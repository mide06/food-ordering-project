const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: { min: 0 },
  },

  paymentMethod: {
    type: DataTypes.ENUM('card', 'cash', 'upi', 'wallet'),
    allowNull: false,
  },

  reference: { // renamed from transactionId
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  status: {
    type: DataTypes.ENUM('initiated', 'successful', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'initiated',
  },

}, {
  timestamps: true, // Sequelize handles createdAt & updatedAt automatically
});

module.exports = Payment;