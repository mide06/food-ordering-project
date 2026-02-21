const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware to debug requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const orderRoutes = require('./routes/order.routes');
app.use('/api/orders', orderRoutes);

const paymentRoutes = require('./routes/payment.routes');
app.use('/api/payments', paymentRoutes);

const menuRoutes = require('./routes/menu.routes');
app.use('/api/menu', menuRoutes);

const qrRoutes = require('./routes/qr.routes');
app.use('/api', qrRoutes);

const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

module.exports = app;