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
    }
};

module.exports = adminController; 