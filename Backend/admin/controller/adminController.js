const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'your-secret-key';

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
                `SELECT o.*, c.name as customer_name, c.email as customer_email, 
                        m.item_name, m.price
                 FROM orders o
                 JOIN customer c ON o.customer_id = c.customer_id
                 JOIN menu m ON o.menu_id = m.menu_id
                 ORDER BY o.order_date DESC`,
                [],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            res.json(result.rows);
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
                        m.item_name, m.price, m.description
                 FROM orders o
                 JOIN customer c ON o.customer_id = c.customer_id
                 JOIN menu m ON o.menu_id = m.menu_id
                 WHERE o.order_id = :1`,
                [orderId],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.json(result.rows[0]);
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

            const result = await connection.execute(
                `UPDATE orders 
                 SET order_status = :1 
                 WHERE order_id = :2`,
                [status, orderId]
            );

            if (result.rowsAffected === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            await connection.commit();
            res.json({ message: 'Order status updated successfully' });
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ error: 'Error updating order status' });
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
    }
};

module.exports = adminController; 