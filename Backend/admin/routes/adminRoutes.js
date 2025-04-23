const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');

// Admin login route
router.post('/login', adminController.login);

// Protected admin routes
router.use(adminController.verifyToken);

// Dashboard statistics route
router.get('/dashboard/stats', adminController.getDashboardStats);

// Orders routes
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:orderId', adminController.getOrderDetails);
router.put('/orders/:orderId/status', adminController.updateOrderStatus);

// Customer routes
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/:customerId', adminController.getCustomerDetails);
router.delete('/customers/:customerId', adminController.deleteCustomer);

// Analytics routes
router.get('/analytics/sales', adminController.getSalesAnalytics);
router.get('/analytics/menu', adminController.getMenuAnalytics);
router.get('/analytics/customers', adminController.getCustomerAnalytics);

// Settings routes
router.put('/settings/password', adminController.changePassword);

// Menu management routes
router.get('/menu', adminController.getAllMenuItems);
router.post('/menu', adminController.addMenuItem);
router.put('/menu/:menuId', adminController.updateMenuItem);
router.delete('/menu/:menuId', adminController.deleteMenuItem);

// Employee management routes
router.get('/employees', adminController.getAllEmployees);
router.get('/employees/:employeeId', adminController.getEmployeeById);
router.post('/employees', adminController.addEmployee);
router.put('/employees/:employeeId', adminController.updateEmployee);
router.delete('/employees/:employeeId', adminController.deleteEmployee);

// Add more protected admin routes here
// Example:
// router.get('/orders', adminController.getOrders);
// etc.

module.exports = router; 