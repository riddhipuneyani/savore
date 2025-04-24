const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key';
const path = require('path');
const fs = require('fs');

const adminController = {
    // Admin login
    login: async (req, res) => {
        const { username, password } = req.body;
        let connection;

        try {
            connection = await oracledb.getConnection();
            
            // Check if admin exists
            const result = await connection.execute(
                'SELECT * FROM admin WHERE username = :1',
                [username],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const admin = result.rows[0];

            // Compare passwords
            if (password !== admin.PASSWORD) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Create admin object without sensitive data
            const adminObject = {
                admin_id: admin.ADMIN_ID,
                username: admin.USERNAME,
                name: admin.NAME
            };

            // Generate JWT token
            const token = jwt.sign(
                { admin_id: admin.ADMIN_ID },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                admin: adminObject
            });
        } catch (error) {
            console.error('Admin login error:', error);
            res.status(500).json({ error: 'Error during login' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Verify admin token
    verifyToken: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        jwt.verify(token, JWT_SECRET, (err, admin) => {
            if (err) {
                console.error('Token verification error:', err);
                return res.status(403).json({ error: 'Invalid token' });
            }
            req.admin = admin;
            next();
        });
    },

    // Get dashboard statistics
    getDashboardStats: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            // Get total orders
            const totalOrdersResult = await connection.execute(
                'SELECT COUNT(*) as total FROM orders',
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Get total customers
            const totalCustomersResult = await connection.execute(
                'SELECT COUNT(*) as total FROM customer',
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Get total menu items
            const menuItemsResult = await connection.execute(
                'SELECT COUNT(*) as total FROM menu',
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json({
                totalOrders: totalOrdersResult.rows[0].TOTAL,
                totalCustomers: totalCustomersResult.rows[0].TOTAL,
                menuItems: menuItemsResult.rows[0].TOTAL
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({ error: 'Error fetching dashboard statistics' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all orders with customer and menu details
    getAllOrders: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT DISTINCT o.order_id, o.customer_id, o.total_price, o.order_status, o.order_date,
                        c.name as customer_name, c.email as customer_email,
                        i.menu_id, i.quantity, i.price as item_price,
                        m.item_name, m.description, m.category
                 FROM orders o
                 LEFT JOIN customer c ON o.customer_id = c.customer_id
                 LEFT JOIN (
                    SELECT item_id, menu_id, quantity, price
                    FROM items
                 ) i ON i.item_id = o.item_id
                 LEFT JOIN menu m ON m.menu_id = i.menu_id
                 ORDER BY o.order_date DESC`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            console.log('Raw query result:', result.rows[0]);

            // Group orders by order_id and handle multiple items
            const ordersMap = new Map();
            
            result.rows.forEach(row => {
                const orderId = row.ORDER_ID;
                if (!ordersMap.has(orderId)) {
                    ordersMap.set(orderId, {
                        ORDER_ID: orderId,
                        CUSTOMER_ID: row.CUSTOMER_ID,
                        CUSTOMER_NAME: row.CUSTOMER_NAME,
                        CUSTOMER_EMAIL: row.CUSTOMER_EMAIL,
                        TOTAL_PRICE: row.TOTAL_PRICE,
                        ORDER_STATUS: row.ORDER_STATUS,
                        ORDER_DATE: row.ORDER_DATE,
                        ITEMS: []
                    });
                }
                
                // Only add item if we have menu data
                if (row.MENU_ID && row.ITEM_NAME) {
                    ordersMap.get(orderId).ITEMS.push({
                        MENU_ID: row.MENU_ID,
                        ITEM_NAME: row.ITEM_NAME,
                        CATEGORY: row.CATEGORY,
                        QUANTITY: row.QUANTITY,
                        PRICE: row.ITEM_PRICE,
                        DESCRIPTION: row.DESCRIPTION
                    });
                }
            });

            // Convert map to array
            const formattedOrders = Array.from(ordersMap.values());
            console.log('Formatted order:', JSON.stringify(formattedOrders[0], null, 2));
            res.json(formattedOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({ error: 'Error fetching orders' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get order details by ID
    getOrderDetails: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { orderId } = req.params;
            
            const result = await connection.execute(
                `SELECT o.*, c.name as customer_name, c.email as customer_email, 
                        c.phone_number, c.address,
                        i.item_id, i.quantity,
                        m.item_name, m.price, m.description
                 FROM orders o
                 JOIN customer c ON o.customer_id = c.customer_id
                 JOIN items i ON o.item_id = i.item_id
                 JOIN menu m ON i.menu_id = m.menu_id
                 WHERE o.order_id = :1`,
                [orderId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Format the response to include all items with their quantities
            const order = {
                ORDER_ID: result.rows[0].ORDER_ID,
                CUSTOMER_ID: result.rows[0].CUSTOMER_ID,
                CUSTOMER_NAME: result.rows[0].CUSTOMER_NAME,
                CUSTOMER_EMAIL: result.rows[0].CUSTOMER_EMAIL,
                PHONE_NUMBER: result.rows[0].PHONE_NUMBER,
                ADDRESS: result.rows[0].ADDRESS,
                TOTAL_PRICE: result.rows[0].TOTAL_PRICE,
                ORDER_STATUS: result.rows[0].ORDER_STATUS,
                ORDER_DATE: result.rows[0].ORDER_DATE,
                ITEMS: result.rows.map(row => ({
                    ITEM_ID: row.ITEM_ID,
                    ITEM_NAME: row.ITEM_NAME,
                    QUANTITY: row.QUANTITY,
                    PRICE: row.PRICE,
                    DESCRIPTION: row.DESCRIPTION
                }))
            };

            res.json(order);
        } catch (error) {
            console.error('Error fetching order details:', error);
            res.status(500).json({ error: 'Error fetching order details' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Update order status
    updateOrderStatus: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { orderId } = req.params;
            const { status } = req.body;

            // Validate status
            const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            // Get current order status
            const currentStatusResult = await connection.execute(
                `SELECT order_status FROM orders WHERE order_id = :1`,
                [orderId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (currentStatusResult.rows.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const currentStatus = currentStatusResult.rows[0].ORDER_STATUS;

            // Validate status transition
            if (status === 'Processing' && currentStatus !== 'Pending') {
                return res.status(400).json({ error: 'Only Pending orders can be moved to Processing' });
            }

            if (status === 'Completed' && currentStatus !== 'Processing') {
                return res.status(400).json({ error: 'Only Processing orders can be completed' });
            }

            if (status === 'Cancelled' && currentStatus === 'Completed') {
                return res.status(400).json({ error: 'Completed orders cannot be cancelled' });
            }

            // Update order status
            const result = await connection.execute(
                `UPDATE orders SET order_status = :1 WHERE order_id = :2`,
                [status, orderId]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // If order is completed, update delivery status
            if (status === 'Completed') {
                await connection.execute(
                    `UPDATE deliveries SET delivery_status = 'Delivered' WHERE order_id = :1`,
                    [orderId]
                );
            }

            // If order is cancelled, update delivery status
            if (status === 'Cancelled') {
                await connection.execute(
                    `UPDATE deliveries SET delivery_status = 'Cancelled' WHERE order_id = :1`,
                    [orderId]
                );
            }

            // Commit the transaction
            await connection.commit();
            res.json({ message: 'Order status updated successfully' });
        } catch (error) {
            console.error('Error updating order status:', error);
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            res.status(500).json({ error: 'Error updating order status: ' + error.message });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all customers with their order count
    getAllCustomers: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT c.*, 
                        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) as order_count
                 FROM customer c
                 ORDER BY c.name`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching customers:', error);
            res.status(500).json({ error: 'Error fetching customers' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get customer details with their orders
    getCustomerDetails: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { customerId } = req.params;
            
            // Get customer details
            const customerResult = await connection.execute(
                `SELECT * FROM customer WHERE customer_id = :1`,
                [customerId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (customerResult.rows.length === 0) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            // Get customer's orders
            const ordersResult = await connection.execute(
                `SELECT o.*, m.item_name, m.price
                 FROM orders o
                 JOIN menu m ON o.menu_id = m.menu_id
                 WHERE o.customer_id = :1
                 ORDER BY o.order_date DESC`,
                [customerId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json({
                customer: customerResult.rows[0],
                orders: ordersResult.rows
            });
        } catch (error) {
            console.error('Error fetching customer details:', error);
            res.status(500).json({ error: 'Error fetching customer details' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Delete customer
    deleteCustomer: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { customerId } = req.params;

            // First check if customer has any orders
            const ordersCheck = await connection.execute(
                'SELECT COUNT(*) as order_count FROM orders WHERE customer_id = :1',
                [customerId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (ordersCheck.rows[0].ORDER_COUNT > 0) {
                return res.status(400).json({ 
                    error: 'Cannot delete customer with existing orders. Please delete orders first.' 
                });
            }

            // Delete customer
            const result = await connection.execute(
                'DELETE FROM customer WHERE customer_id = :1',
                [customerId]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            await connection.commit();
            res.json({ message: 'Customer deleted successfully' });
        } catch (error) {
            console.error('Error deleting customer:', error);
            res.status(500).json({ error: 'Error deleting customer' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get sales analytics
    getSalesAnalytics: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            // Get total sales and average order value
            const salesResult = await connection.execute(
                `SELECT 
                    SUM(TOTAL_PRICE) as total_sales,
                    AVG(TOTAL_PRICE) as avg_order_value,
                    COUNT(*) as total_orders
                 FROM orders`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Get sales by order status
            const statusResult = await connection.execute(
                `SELECT 
                    ORDER_STATUS,
                    COUNT(*) as count,
                    SUM(TOTAL_PRICE) as total
                 FROM orders
                 GROUP BY ORDER_STATUS`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json({
                totalSales: salesResult.rows[0].TOTAL_SALES || 0,
                avgOrderValue: salesResult.rows[0].AVG_ORDER_VALUE || 0,
                totalOrders: salesResult.rows[0].TOTAL_ORDERS || 0,
                salesByStatus: statusResult.rows
            });
        } catch (error) {
            console.error('Error fetching sales analytics:', error);
            res.status(500).json({ error: 'Error fetching sales analytics' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get menu analytics
    getMenuAnalytics: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            // Get top selling items
            const topItemsResult = await connection.execute(
                `SELECT 
                    m.ITEM_NAME,
                    COUNT(o.ORDER_ID) as order_count,
                    SUM(o.QUANTITY) as total_quantity,
                    SUM(o.TOTAL_PRICE) as total_revenue
                 FROM menu m
                 JOIN orders o ON m.MENU_ID = o.MENU_ID
                 GROUP BY m.ITEM_NAME
                 ORDER BY total_revenue DESC
                 FETCH FIRST 5 ROWS ONLY`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Get menu categories distribution
            const categoriesResult = await connection.execute(
                `SELECT 
                    CATEGORY,
                    COUNT(*) as item_count,
                    SUM(PRICE) as total_value
                 FROM menu
                 GROUP BY CATEGORY`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json({
                topSellingItems: topItemsResult.rows,
                categoriesDistribution: categoriesResult.rows
            });
        } catch (error) {
            console.error('Error fetching menu analytics:', error);
            res.status(500).json({ error: 'Error fetching menu analytics' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get customer analytics
    getCustomerAnalytics: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            // Get customer order statistics
            const customerStatsResult = await connection.execute(
                `SELECT 
                    COUNT(DISTINCT c.CUSTOMER_ID) as total_customers,
                    AVG(o.order_count) as avg_orders_per_customer,
                    MAX(o.order_count) as max_orders
                 FROM customer c
                 LEFT JOIN (
                     SELECT CUSTOMER_ID, COUNT(*) as order_count
                     FROM orders
                     GROUP BY CUSTOMER_ID
                 ) o ON c.CUSTOMER_ID = o.CUSTOMER_ID`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Get top customers by spending
            const topCustomersResult = await connection.execute(
                `SELECT 
                    c.NAME,
                    c.EMAIL,
                    COUNT(o.ORDER_ID) as order_count,
                    SUM(o.TOTAL_PRICE) as total_spent
                 FROM customer c
                 JOIN orders o ON c.CUSTOMER_ID = o.CUSTOMER_ID
                 GROUP BY c.NAME, c.EMAIL
                 ORDER BY total_spent DESC
                 FETCH FIRST 5 ROWS ONLY`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json({
                totalCustomers: customerStatsResult.rows[0].TOTAL_CUSTOMERS || 0,
                avgOrdersPerCustomer: customerStatsResult.rows[0].AVG_ORDERS_PER_CUSTOMER || 0,
                maxOrders: customerStatsResult.rows[0].MAX_ORDERS || 0,
                topCustomers: topCustomersResult.rows
            });
        } catch (error) {
            console.error('Error fetching customer analytics:', error);
            res.status(500).json({ error: 'Error fetching customer analytics' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Change admin password
    changePassword: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { currentPassword, newPassword } = req.body;
            const adminId = req.admin.admin_id;

            // Verify current password
            const result = await connection.execute(
                'SELECT PASSWORD FROM admin WHERE ADMIN_ID = :1',
                [adminId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Admin not found' });
            }

            if (result.rows[0].PASSWORD !== currentPassword) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Update password (trigger will handle validation and logging)
            await connection.execute(
                'UPDATE admin SET PASSWORD = :1 WHERE ADMIN_ID = :2',
                [newPassword, adminId]
            );

            await connection.commit();
            res.json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            
            // Check if error is from trigger
            if (error.errorNum === 20001) {
                return res.status(400).json({ error: error.message });
            }
            
            res.status(500).json({ error: 'Error changing password' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all menu items
    getAllMenuItems: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT menu_id as "ITEM_ID", 
                        item_name as "ITEM_NAME", 
                        description as "DESCRIPTION", 
                        price as "PRICE", 
                        category as "CATEGORY",
                        availability_status as "AVAILABILITY_STATUS"
                 FROM menu
                 ORDER BY category, item_name`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching menu items:', error);
            res.status(500).json({ error: 'Error fetching menu items' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Update menu item
    updateMenuItem: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { menuId } = req.params;
            const { name, description, price, category, availability_status } = req.body;

            const updateQuery = `
                UPDATE menu 
                SET item_name = :1, description = :2, price = :3, category = :4, availability_status = :5
                WHERE menu_id = :6
            `;
            const updateParams = [name, description, price, category, availability_status, menuId];

            await connection.execute(updateQuery, updateParams);
            await connection.commit();

            res.json({ message: 'Menu item updated successfully' });
        } catch (error) {
            console.error('Error updating menu item:', error);
            res.status(500).json({ error: 'Error updating menu item' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all employees
    getAllEmployees: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT * FROM employee ORDER BY name`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching employees:', error);
            res.status(500).json({ error: 'Error fetching employees' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Add new employee
    addEmployee: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { name, role, phone_number, salary } = req.body;

            // Generate employee ID (E001, E002, etc.)
            const result = await connection.execute(
                'SELECT MAX(TO_NUMBER(SUBSTR(employee_id, 2))) as max_id FROM employee'
            );
            const maxId = result.rows[0][0] || 0;
            const employeeId = `E${String(maxId + 1).padStart(3, '0')}`;

            // Validate role
            if (!['Delivery', 'Chef', 'Manager'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role. Must be Delivery, Chef, or Manager' });
            }

            await connection.execute(
                `INSERT INTO employee (
                    employee_id, name, role, phone_number, salary
                ) VALUES (
                    :1, :2, :3, :4, :5
                )`,
                [employeeId, name, role, phone_number, salary]
            );

            await connection.commit();

            res.status(201).json({
                message: 'Employee added successfully',
                employeeId: employeeId
            });
        } catch (error) {
            console.error('Error adding employee:', error);
            res.status(500).json({ error: 'Error adding employee' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Update employee
    updateEmployee: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { employeeId } = req.params;
            const { name, role, phone_number, salary } = req.body;

            // Validate role
            if (!['Delivery', 'Chef', 'Manager'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role. Must be Delivery, Chef, or Manager' });
            }

            const result = await connection.execute(
                `UPDATE employee 
                 SET name = :1,
                     role = :2,
                     phone_number = :3,
                     salary = :4
                 WHERE employee_id = :5`,
                [name, role, phone_number, salary, employeeId]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            await connection.commit();
            res.json({ message: 'Employee updated successfully' });
        } catch (error) {
            console.error('Error updating employee:', error);
            res.status(500).json({ error: 'Error updating employee' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Delete employee
    deleteEmployee: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { employeeId } = req.params;

            // First check if employee has any active deliveries
            const deliveryCheck = await connection.execute(
                `SELECT 1 FROM deliveries 
                 WHERE delivery_person_id = :1 
                 AND delivery_status = 'Out for Delivery'`,
                [employeeId]
            );

            if (deliveryCheck.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Cannot delete employee with active deliveries. Please reassign or complete the deliveries first.' 
                });
            }

            // Now delete from employee table
            const result = await connection.execute(
                'DELETE FROM employee WHERE employee_id = :1',
                [employeeId]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            await connection.commit();
            res.json({ message: 'Employee deleted successfully' });
        } catch (error) {
            console.error('Error deleting employee:', error);
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back transaction:', rollbackError);
                }
            }
            res.status(500).json({ error: 'Error deleting employee' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get employee by ID
    getEmployeeById: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { employeeId } = req.params;

            const result = await connection.execute(
                'SELECT * FROM employee WHERE employee_id = :1',
                [employeeId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Employee not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error fetching employee:', error);
            res.status(500).json({ error: 'Error fetching employee' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all unassigned orders
    getUnassignedOrders: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT o.order_id, o.customer_id, o.total_price, o.order_status, o.order_date,
                        c.name as customer_name, c.address, c.phone_number
                 FROM orders o
                 JOIN customer c ON o.customer_id = c.customer_id
                 WHERE o.order_status = 'Pending'
                 AND NOT EXISTS (
                    SELECT 1 
                    FROM deliveries d 
                    WHERE d.order_id = o.order_id 
                    AND d.delivery_status = 'Out for Delivery'
                 )
                 ORDER BY o.order_date ASC`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            console.log('Unassigned orders result:', result.rows);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching unassigned orders:', error);
            res.status(500).json({ error: 'Error fetching unassigned orders' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all available delivery persons
    getAvailableDeliveryPersons: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT e.employee_id, e.name, e.phone_number, d.rating
                 FROM employee e
                 JOIN delivery d ON e.employee_id = d.employee_id
                 WHERE e.role = 'Delivery'
                 AND e.employee_id NOT IN (
                    SELECT delivery_person_id 
                    FROM deliveries 
                    WHERE delivery_status = 'Out for Delivery'
                 )
                 ORDER BY e.name`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching available delivery persons:', error);
            res.status(500).json({ error: 'Error fetching available delivery persons' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Assign delivery person to order
    assignDeliveryPerson: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            const { order_id, delivery_person_id } = req.body;

            // First check if the employee exists and is a delivery person
            const employeeCheck = await connection.execute(
                `SELECT employee_id, name, role 
                 FROM employee 
                 WHERE employee_id = :1`,
                [delivery_person_id],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (employeeCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Employee not found' });
            }

            if (employeeCheck.rows[0].ROLE !== 'Delivery') {
                return res.status(400).json({ error: 'Employee is not a delivery person' });
            }

            // Get the delivery_id for this employee
            const deliveryCheck = await connection.execute(
                `SELECT d.delivery_id 
                 FROM delivery d
                 WHERE d.employee_id = :1`,
                [delivery_person_id],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (deliveryCheck.rows.length === 0) {
                return res.status(400).json({ error: 'No delivery record found for this employee' });
            }

            const delivery_person_delivery_id = deliveryCheck.rows[0].DELIVERY_ID;

            // Check if delivery person is already assigned to another active delivery
            const activeDeliveryCheck = await connection.execute(
                `SELECT 1 FROM deliveries 
                 WHERE delivery_person_id = :1 
                 AND delivery_status = 'Out for Delivery'`,
                [delivery_person_delivery_id],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (activeDeliveryCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Delivery person is already assigned to an active delivery' });
            }

            // Generate a new delivery record ID
            const newDeliveryIdResult = await connection.execute(
                `SELECT 'D' || LPAD(NVL(MAX(TO_NUMBER(SUBSTR(delivery_id, 2))), 0) + 1, 3, '0') as new_id 
                 FROM deliveries`
            );
            const new_delivery_id = newDeliveryIdResult.rows[0][0];

            // Insert into deliveries table
            await connection.execute(
                `INSERT INTO deliveries (
                    delivery_id, 
                    order_id, 
                    delivery_person_id, 
                    delivery_status, 
                    delivery_time
                ) VALUES (
                    :1, :2, :3, 'Out for Delivery', SYSDATE
                )`,
                [new_delivery_id, order_id, delivery_person_delivery_id]
            );

            // Update order status to Processing
            await connection.execute(
                `UPDATE orders 
                 SET order_status = 'Processing'
                 WHERE order_id = :1`,
                [order_id]
            );

            await connection.commit();

            res.json({ 
                message: 'Delivery person assigned successfully',
                delivery_id: new_delivery_id
            });
        } catch (error) {
            console.error('Error assigning delivery person:', error);
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error('Error rolling back:', rollbackError);
                }
            }
            res.status(500).json({ error: 'Error assigning delivery person: ' + error.message });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    },

    // Get all active deliveries
    getActiveDeliveries: async (req, res) => {
        let connection;
        try {
            connection = await oracledb.getConnection();
            
            const result = await connection.execute(
                `SELECT d.delivery_id, d.order_id, d.delivery_person_id, 
                        d.delivery_status, d.delivery_time,
                        o.customer_id, o.total_price, o.order_status,
                        c.name as customer_name, c.address, c.phone_number,
                        e.name as delivery_person_name, e.phone_number as delivery_person_phone
                 FROM deliveries d
                 JOIN orders o ON d.order_id = o.order_id
                 JOIN customer c ON o.customer_id = c.customer_id
                 JOIN delivery dl ON d.delivery_person_id = dl.delivery_id
                 JOIN employee e ON dl.employee_id = e.employee_id
                 WHERE d.delivery_status = 'Out for Delivery'
                 ORDER BY d.delivery_time DESC`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            console.log('Active deliveries result:', result.rows);
            res.json(result.rows);
        } catch (error) {
            console.error('Error fetching active deliveries:', error);
            res.status(500).json({ error: 'Error fetching active deliveries' });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (closeError) {
                    console.error('Error closing connection:', closeError);
                }
            }
        }
    }
    };

module.exports = adminController; 