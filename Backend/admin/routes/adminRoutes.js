const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// Admin login route
router.post('/login', adminController.login);

// Protected admin routes
router.use(adminController.verifyToken);

// Dashboard statistics route
router.get('/dashboard/stats', adminController.getDashboardStats);

// Add more protected admin routes here
// Example:
// router.get('/orders', adminController.getOrders);
// etc.

module.exports = router; 