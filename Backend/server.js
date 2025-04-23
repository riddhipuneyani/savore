// server.js
const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors');
const dbConfig = require('./dbconfig');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import admin routes
const adminRoutes = require('./admin/routes/adminRoutes');

// Create the Express app
const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to handle JSON request bodies
app.use(express.json());

// JWT Secret
const JWT_SECRET = 'your-secret-key';

// Initialize database pool
async function initialize() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Connection pool created');
        
        // Start the server only after pool is created
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Error creating connection pool:', err);
        process.exit(1);
    }
}

// Middleware to get connection from pool
async function getConnection(req, res, next) {
    try {
        req.connection = await oracledb.getConnection();
        next();
    } catch (err) {
        console.error('Error getting connection:', err);
        res.status(500).json({ error: 'Database connection error' });
    }
}

// Middleware to release connection
async function releaseConnection(req, res, next) {
    if (req.connection) {
        try {
            await req.connection.close();
        } catch (err) {
            console.error('Error closing connection:', err);
        }
    }
    next();
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone_number, password, address } = req.body;
    let connection;

    try {
        console.log('Registration attempt:', { name, email, phone_number, address });

        // Get a new connection for this transaction
        connection = await oracledb.getConnection(dbConfig);
        console.log('Connected to database');

        // Check if email already exists
        const emailCheck = await connection.execute(
            'SELECT * FROM customer WHERE email = :1',
            [email]
        );

        if (emailCheck.rows.length > 0) {
            console.log('Email already exists:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if phone number already exists
        const phoneCheck = await connection.execute(
            'SELECT * FROM customer WHERE phone_number = :1',
            [phone_number]
        );

        if (phoneCheck.rows.length > 0) {
            console.log('Phone number already exists:', phone_number);
            return res.status(400).json({ error: 'Phone number already registered' });
        }

        // Get the current maximum customer ID
        const result = await connection.execute(
            'SELECT MAX(TO_NUMBER(SUBSTR(customer_id, 2))) as max_id FROM customer'
        );
        
        // If no customers exist, start from 11, otherwise increment from max
        const maxId = result.rows[0][0] || 10;  // Start from 10 if no customers exist
        const nextId = maxId + 1;
        const customerId = `C${String(nextId).padStart(3, '0')}`;
        
        console.log('Max ID from DB:', maxId);
        console.log('Next ID to use:', nextId);
        console.log('Generated customer ID:', customerId);

        // Insert new customer using the generated customerId
        await connection.execute(
            `INSERT INTO customer (customer_id, name, email, phone_number, password, address)
             VALUES (:1, :2, :3, :4, :5, :6)`,
            [customerId, name, email, phone_number, password, address]
        );

        // Commit the transaction
        await connection.commit();
        console.log('Customer inserted successfully');

        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        // Rollback the transaction in case of error
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    } finally {
        // Close the connection
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error('Error closing connection:', closeError);
            }
        }
    }
});

// Login endpoint
app.post('/api/auth/login', getConnection, async (req, res) => {
    const { email, password } = req.body;
    
    try {
        console.log('Login attempt for email:', email);
        
        const result = await req.connection.execute(
            'SELECT * FROM customer WHERE email = :1',
            [email],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        console.log('User found:', user);

        // Compare passwords
        if (password.trim() !== user.PASSWORD.trim()) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create user object
        const userObject = {
            customer_id: user.CUSTOMER_ID,
            name: user.NAME,
            email: user.EMAIL,
            phone_number: user.PHONE_NUMBER,
            address: user.ADDRESS
        };

        // Generate JWT token
        const token = jwt.sign(
            { customer_id: user.CUSTOMER_ID },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful for:', email);
        res.json({
            token,
            user: userObject
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error during login' });
    }
});

// Create order endpoint
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { menu_id, quantity, total_price } = req.body;
        const customerId = req.user.customerId;
        
        // Generate order ID
        const result = await req.connection.execute('SELECT MAX(TO_NUMBER(SUBSTR(order_id, 2))) as max_id FROM orders');
        const maxId = result.rows[0].MAX_ID || 0;
        const orderId = `O${String(maxId + 1).padStart(3, '0')}`;
        
        // Insert new order
        await req.connection.execute(
            'INSERT INTO orders (order_id, customer_id, menu_id, quantity, total_price, order_status) VALUES (:1, :2, :3, :4, :5, :6)',
            [orderId, customerId, menu_id, quantity, total_price, 'Pending']
        );
        
        res.json({ message: 'Order created successfully', orderId });
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Order creation failed' });
    }
});

// Get customer orders endpoint
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const customerId = req.user.customerId;
        
        const result = await req.connection.execute(
            `SELECT o.*, m.item_name, m.price 
             FROM orders o 
             JOIN menu m ON o.menu_id = m.menu_id 
             WHERE o.customer_id = :1 
             ORDER BY o.order_date DESC`,
            [customerId]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Route to fetch data from Oracle database
app.get('/api/admin', async (req, res) => {
    try {
        const result = await req.connection.execute('SELECT * FROM admin');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching admin items:', err);
        res.status(500).send('Error fetching admin items');
    }
});

// Get menu items endpoint
app.get('/api/menu', async (req, res) => {
    try {
        const result = await req.connection.execute(
            'SELECT * FROM menu WHERE availability_status = :1 ORDER BY category, item_name',
            ['Available']
        );
        
        // Format the response
        const menuItems = result.rows.map(item => ({
            menu_id: item.MENU_ID,
            item_name: item.ITEM_NAME,
            category: item.CATEGORY,
            price: item.PRICE,
            description: item.DESCRIPTION,
            availability_status: item.AVAILABILITY_STATUS
        }));
        
        res.json(menuItems);
    } catch (err) {
        console.error('Error fetching menu items:', err);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// Get user profile endpoint
app.get('/api/auth/profile', [authenticateToken, getConnection], async (req, res) => {
    try {
        const customerId = req.user.customer_id;
        console.log('Fetching profile for customer ID:', customerId);

        const result = await req.connection.execute(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM orders WHERE customer_id = c.customer_id) as total_orders,
                    (SELECT SUM(total_price) FROM orders WHERE customer_id = c.customer_id) as total_spent
             FROM customer c 
             WHERE c.customer_id = :1`,
            [customerId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        res.json({
            user: {
                customer_id: user.CUSTOMER_ID,
                name: user.NAME,
                email: user.EMAIL,
                phone_number: user.PHONE_NUMBER,
                address: user.ADDRESS,
                total_orders: user.TOTAL_ORDERS || 0,
                total_spent: user.TOTAL_SPENT || 0
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile data' });
    }
});

// Update user profile endpoint
app.put('/api/auth/profile', [authenticateToken, getConnection], async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const customerId = req.user.customer_id;
        const { name, email, phone_number, address } = req.body;
        
        console.log('Updating profile for customer ID:', customerId);
        console.log('Update data:', { name, email, phone_number, address });
        
        // Validate input
        if (!name || !email || !phone_number || !address) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if email is already used by another customer
        const emailCheck = await connection.execute(
            'SELECT customer_id FROM customer WHERE email = :1 AND customer_id != :2',
            [email, customerId]
        );
        
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Email is already in use by another account' });
        }

        // Check if phone number is already used by another customer
        const phoneCheck = await connection.execute(
            'SELECT customer_id FROM customer WHERE phone_number = :1 AND customer_id != :2',
            [phone_number, customerId]
        );
        
        if (phoneCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Phone number is already in use by another account' });
        }

        // Update customer information
        const updateResult = await connection.execute(
            `UPDATE customer 
             SET name = :1, 
                 email = :2, 
                 phone_number = :3, 
                 address = :4 
             WHERE customer_id = :5`,
            [name, email, phone_number, address, customerId]
        );

        if (updateResult.rowsAffected === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch updated user data
        const updatedUser = await connection.execute(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM orders WHERE customer_id = c.customer_id) as total_orders,
                    (SELECT SUM(total_price) FROM orders WHERE customer_id = c.customer_id) as total_spent
             FROM customer c 
             WHERE c.customer_id = :1`,
            [customerId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Commit the transaction
        await connection.commit();
        
        res.json({ 
            message: 'Profile updated successfully',
            user: {
                customer_id: updatedUser.rows[0].CUSTOMER_ID,
                name: updatedUser.rows[0].NAME,
                email: updatedUser.rows[0].EMAIL,
                phone_number: updatedUser.rows[0].PHONE_NUMBER,
                address: updatedUser.rows[0].ADDRESS,
                total_orders: updatedUser.rows[0].TOTAL_ORDERS || 0,
                total_spent: updatedUser.rows[0].TOTAL_SPENT || 0
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        res.status(500).json({ error: 'Failed to update profile' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error('Error closing connection:', closeError);
            }
        }
    }
});

// Delete account endpoint
app.delete('/api/auth/delete-account', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const customerId = req.user.customer_id;

        // Check for active orders
        const orderResult = await connection.execute(
            'SELECT COUNT(*) FROM orders WHERE customer_id = :1 AND order_status IN (\'Pending\', \'Processing\')',
            [customerId]
        );

        if (orderResult.rows[0][0] > 0) {
            return res.status(400).json({ error: 'Cannot delete account with active orders' });
        }

        // Delete the customer
        await connection.execute(
            'DELETE FROM customer WHERE customer_id = :1',
            [customerId]
        );

        await connection.commit();
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        res.status(500).json({ error: 'Failed to delete account' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Get feedbacks endpoint
app.get('/api/feedbacks', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT f.*, c.name as customer_name 
             FROM feedback f 
             JOIN customer c ON f.customer_id = c.customer_id 
             ORDER BY f.rating_id DESC`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching feedbacks:', error);
        res.status(500).json({ error: 'Error fetching feedbacks' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Admin routes
app.use('/api/admin', adminRoutes);

// Initialize the application
initialize().catch((err) => {
    console.error('Failed to initialize application:', err);
    process.exit(1);
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });   
});
