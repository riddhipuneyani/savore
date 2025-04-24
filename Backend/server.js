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

// Create items endpoint
app.post('/api/items', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { items, item_id } = req.body;

        if (!item_id) {
            throw new Error('Missing item_id in request body');
        }

        // Merge quantities of same item_name
        const mergedItems = {};
        for (const item of items) {
            if (mergedItems[item.item_name]) {
                mergedItems[item.item_name] += item.quantity;
            } else {
                mergedItems[item.item_name] = item.quantity;
            }
        }

        // Loop over merged items
        for (const [itemName, totalQuantity] of Object.entries(mergedItems)) {
            const menuResult = await connection.execute(
                'SELECT menu_id FROM menu WHERE item_name = :1',
                [itemName],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (menuResult.rows.length === 0) {
                throw new Error(`Menu item not found: ${itemName}`);
            }

            const menu_id = menuResult.rows[0].MENU_ID;

            const existingItem = await connection.execute(
                'SELECT * FROM items WHERE item_id = :1 AND menu_id = :2',
                [item_id, menu_id],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (existingItem.rows.length > 0) {
                await connection.execute(
                    `UPDATE items SET quantity = quantity + :1 
                     WHERE item_id = :2 AND menu_id = :3`,
                    [totalQuantity, item_id, menu_id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO items (item_id, menu_id, quantity)
                     VALUES (:1, :2, :3)`,
                    [item_id, menu_id, totalQuantity]
                );
            }
        }

        await connection.commit();
        res.json({ item_id });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        console.error('Error creating items:', err);
        res.status(500).json({ error: 'Failed to create items: ' + err.message });
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



// Create order endpoint
app.post('/api/orders', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { items, payment_method } = req.body;
        const customerId = req.user.customer_id;

        // Generate unique item_id
        const itemIdResult = await connection.execute(
            `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(item_id, '[^0-9]', ''))), 0) as max_id FROM items`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const itemMaxId = itemIdResult.rows[0].MAX_ID;
        const item_id = `I${String(itemMaxId + 1).padStart(3, '0')}`;

        // Create items with the generated item_id
        const itemsResponse = await fetch('http://localhost:3000/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${req.headers.authorization.split(' ')[1]}`
            },
            body: JSON.stringify({ items, item_id })
        });

        if (!itemsResponse.ok) {
            const errorData = await itemsResponse.json();
            throw new Error(errorData.error || 'Failed to create items');
        }

        // Calculate total price
        const totalPriceResult = await connection.execute(
            `SELECT SUM(m.price * i.quantity) AS total_price
             FROM items i
             JOIN menu m ON i.menu_id = m.menu_id
             WHERE i.item_id = :1`,
            [item_id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const totalPrice = totalPriceResult.rows[0].TOTAL_PRICE || 0;

        // Generate order ID
        const orderResult = await connection.execute(
            `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(order_id, '[^0-9]', ''))), 0) as max_id FROM orders`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const maxOrderId = orderResult.rows[0].MAX_ID;
        const orderId = `O${String(maxOrderId + 1).padStart(3, '0')}`;

        // Insert order
        await connection.execute(
            `INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date, total_price)
             VALUES (:1, :2, :3, :4, SYSDATE, :5)`,
            [orderId, customerId, item_id, 'Pending', totalPrice]
        );

        // Generate payment ID
        const paymentResult = await connection.execute(
            `SELECT NVL(MAX(TO_NUMBER(REGEXP_REPLACE(payment_id, '[^0-9]', ''))), 0) as max_id FROM payment`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const paymentMaxId = paymentResult.rows[0].MAX_ID;
        const paymentId = `P${String(paymentMaxId + 1).padStart(3, '0')}`;

        // Set payment status based on payment method
        const payment_status = payment_method.toLowerCase() === 'cash' ? 'Pending' : 'Completed';

        // Insert payment
        await connection.execute(
            `INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date)
             VALUES (:1, :2, :3, :4, SYSDATE)`,
            [paymentId, orderId, payment_status, payment_method]
        );

        await connection.commit();

        res.json({
            message: 'Order created successfully',
            order_id: orderId,
            item_id: item_id,
            payment_id: paymentId
        });
    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Order creation failed: ' + err.message });
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


// Get customer orders endpoint
app.get('/api/orders', [authenticateToken, getConnection], async (req, res) => {
    try {
        const customerId = req.user.customer_id;
        
        const result = await req.connection.execute(
            `SELECT o.order_id, o.customer_id, o.order_date, o.order_status, o.total_price,
                    m.item_name, i.quantity, i.price as item_price,
                    p.payment_method, p.payment_status
             FROM orders o 
             JOIN items i ON o.item_id = i.item_id
             JOIN menu m ON i.menu_id = m.menu_id
             LEFT JOIN payment p ON o.order_id = p.order_id
             WHERE o.customer_id = :1 
             ORDER BY o.order_date DESC, o.order_id`,
            [customerId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        // Group orders by order_id
        const ordersMap = new Map();
        
        result.rows.forEach(row => {
            const orderId = row.ORDER_ID;
            if (!ordersMap.has(orderId)) {
                ordersMap.set(orderId, {
                    order_id: orderId,
                    customer_id: row.CUSTOMER_ID,
                    order_date: row.ORDER_DATE,
                    order_status: row.ORDER_STATUS,
                    total_price: row.TOTAL_PRICE,
                    payment_method: row.PAYMENT_METHOD || 'Not specified',
                    payment_status: row.PAYMENT_STATUS || 'Pending',
                    items: []
                });
            }
            
            ordersMap.get(orderId).items.push({
                item_name: row.ITEM_NAME,
                quantity: row.QUANTITY,
                price: row.ITEM_PRICE
            });
        });

        // Convert map to array
        const formattedOrders = Array.from(ordersMap.values());

        // Close the connection after we're done
        await req.connection.close();
        
        res.json(formattedOrders);
    } catch (err) {
        // Make sure to close the connection even if there's an error
        if (req.connection) {
            try {
                await req.connection.close();
            } catch (closeError) {
                console.error('Error closing connection:', closeError);
            }
        }
        
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

// Get all menu items
app.get('/api/menu', getConnection, async (req, res) => {
    try {
        const query = `
            SELECT menu_id as id, 
                   item_name as name, 
                   category, 
                   price, 
                   description, 
                   availability_status, 
                   image_link as image 
            FROM menu 
            WHERE availability_status = 'Available'
        `;
        
        const result = await req.connection.execute(
            query,
            [], // no bind params
            { outFormat: oracledb.OUT_FORMAT_OBJECT } // This will return results as objects
        );
        
        // Format the data to ensure correct case
        const formattedData = result.rows.map(item => ({
            id: item.ID,
            name: item.NAME,
            category: item.CATEGORY,
            price: item.PRICE,
            description: item.DESCRIPTION,
            availability_status: item.AVAILABILITY_STATUS,
            image: item.IMAGE
        }));

        // Close the connection after we're done
        await req.connection.close();
        
        res.json({
            status: 'success',
            data: formattedData
        });
    } catch (error) {
        // Make sure to close the connection even if there's an error
        if (req.connection) {
            try {
                await req.connection.close();
            } catch (closeError) {
                console.error('Error closing connection:', closeError);
            }
        }
        
        console.error('Error fetching menu items:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch menu items'
        });
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

// Search menu items endpoint
app.get('/api/search', getConnection, async (req, res) => {
    try {
        const searchTerm = req.query.term;
        
        if (!searchTerm) {
            return res.status(400).json({
                status: 'error',
                message: 'Search term is required'
            });
        }

        const query = `
            SELECT menu_id as id, 
                   item_name as name, 
                   category, 
                   price, 
                   description, 
                   availability_status, 
                   image_link as image 
            FROM menu 
            WHERE availability_status = 'Available'
            AND (
                REGEXP_LIKE(item_name, :1, 'i')
                OR REGEXP_LIKE(category, :2, 'i')
                OR REGEXP_LIKE(description, :3, 'i')
            )
        `;
        
        const result = await req.connection.execute(
            query,
            [searchTerm, searchTerm, searchTerm],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        // Format the data to ensure correct case
        const formattedData = result.rows.map(item => ({
            id: item.ID,
            name: item.NAME,
            category: item.CATEGORY,
            price: item.PRICE,
            description: item.DESCRIPTION,
            availability_status: item.AVAILABILITY_STATUS,
            image: item.IMAGE
        }));

        // Close the connection after we're done
        await req.connection.close();
        
        res.json({
            status: 'success',
            data: formattedData
        });
    } catch (error) {
        // Make sure to close the connection even if there's an error
        if (req.connection) {
            try {
                await req.connection.close();
            } catch (closeError) {
                console.error('Error closing connection:', closeError);
            }
        }
        
        console.error('Error searching menu items:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to search menu items'
        });
    }
});

// Get feedback for an order
app.get('/api/feedback/:orderId', [authenticateToken, getConnection], async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const orderId = req.params.orderId;
        const customerId = req.user.customer_id;

        // Verify the order belongs to the customer
        const orderCheck = await connection.execute(
            'SELECT * FROM orders WHERE order_id = :1 AND customer_id = :2',
            [orderId, customerId]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get feedback if it exists
        const result = await connection.execute(
            'SELECT * FROM feedback WHERE order_id = :1',
            [orderId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(200).json(null); // Return null when no feedback exists
        }

        const feedback = result.rows[0];
        res.json({
            rating_id: feedback.RATING_ID,
            rating_score: feedback.RATING_SCORE,
            feedback_text: feedback.FEEDBACK_TEXT
        });
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
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

// Submit feedback
app.post('/api/feedback', [authenticateToken, getConnection], async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const { order_id, rating_score, feedback_text } = req.body;
        const customerId = req.user.customer_id;

        // Validate input
        if (!order_id || !rating_score || !feedback_text) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (rating_score < 1 || rating_score > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        if (feedback_text.length > 500) {
            return res.status(400).json({ error: 'Feedback text must be less than 500 characters' });
        }

        // Verify the order belongs to the customer
        const orderCheck = await connection.execute(
            'SELECT * FROM orders WHERE order_id = :1 AND customer_id = :2',
            [order_id, customerId]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if feedback already exists
        const existingFeedback = await connection.execute(
            'SELECT * FROM feedback WHERE order_id = :1',
            [order_id]
        );

        if (existingFeedback.rows.length > 0) {
            // Update existing feedback
            await connection.execute(
                `UPDATE feedback 
                 SET rating_score = :1, feedback_text = :2 
                 WHERE order_id = :3`,
                [rating_score, feedback_text, order_id]
            );
        } else {
            // Generate new rating_id
            const maxIdResult = await connection.execute(
                'SELECT MAX(TO_NUMBER(SUBSTR(rating_id, 2))) as max_id FROM feedback'
            );
            const maxId = maxIdResult.rows[0].MAX_ID || 3;
            const ratingId = `F${String(maxId + 1).padStart(3, '0')}`;

            // Insert new feedback
            await connection.execute(
                `INSERT INTO feedback (rating_id, order_id, customer_id, rating_score, feedback_text)
                 VALUES (:1, :2, :3, :4, :5)`,
                [ratingId, order_id, customerId, rating_score, feedback_text]
            );
        }

        await connection.commit();
        res.json({ message: 'Feedback submitted successfully' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        res.status(500).json({ error: 'Failed to submit feedback' });
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

// Delivery Login endpoint
app.post('/api/delivery/login', getConnection, async (req, res) => {
    const { deliveryId, password } = req.body;
    
    try {
        console.log('Delivery login attempt for ID:', deliveryId);
        
        const result = await req.connection.execute(
            `SELECT d.delivery_id, d.password, e.name, e.employee_id, e.phone_number, e.salary
             FROM delivery d
             JOIN employee e ON d.employee_id = e.employee_id
             WHERE d.delivery_id = :1 
             AND e.role = 'Delivery'`,
            [deliveryId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid delivery ID or password' });
        }

        const user = result.rows[0];
        console.log('Delivery person found:', user);

        // Compare passwords
        if (password.trim() !== user.PASSWORD.trim()) {
            return res.status(401).json({ error: 'Invalid delivery ID or password' });
        }

        // Create user object
        const userObject = {
            delivery_id: user.DELIVERY_ID,
            name: user.NAME,
            employee_id: user.EMPLOYEE_ID,
            phone_number: user.PHONE_NUMBER,
            salary: user.SALARY
        };

        // Generate JWT token
        const token = jwt.sign(
            { 
                delivery_id: user.DELIVERY_ID,
                name: user.NAME,
                employee_id: user.EMPLOYEE_ID
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Delivery login successful for:', deliveryId);
        res.json({
            success: true,
            message: "Login successful",
            token,
            user: userObject
        });
    } catch (error) {
        console.error('Delivery login error:', error);
        res.status(500).json({ error: 'Error during delivery login' });
    }
});

// Get delivery person profile endpoint
app.get('/api/delivery/profile', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection();
        
        // Get delivery person details by joining employee and delivery tables
        const result = await conn.execute(
            `SELECT e.name, e.phone_number, d.delivery_id, e.employee_id
             FROM employee e
             JOIN delivery d ON e.employee_id = d.employee_id
             WHERE d.delivery_id = :deliveryId`,
            [req.user.delivery_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Delivery person not found' });
        }

        const profile = {
            name: result.rows[0][0],
            phoneNumber: result.rows[0][1],
            deliveryId: result.rows[0][2],
            employeeId: result.rows[0][3]
        };

        res.json(profile);
    } catch (error) {
        console.error('Error fetching delivery profile:', error);
        res.status(500).json({ error: 'Error fetching delivery profile' });
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Get orders for specific delivery person
app.get('/api/delivery/orders', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection();
        
        const result = await conn.execute(
            `SELECT o.order_id, o.customer_id, o.order_date, o.order_status, o.total_price,
                    c.name as customer_name, c.phone_number as customer_phone, c.address as delivery_address,
                    d.delivery_status,
                    p.payment_method, p.payment_status, p.amount
             FROM orders o
             JOIN customer c ON o.customer_id = c.customer_id
             JOIN deliveries d ON o.order_id = d.order_id
             LEFT JOIN payment p ON o.order_id = p.order_id
             WHERE d.delivery_person_id = :deliveryId
             ORDER BY o.order_date DESC`,
            [req.user.delivery_id]
        );

        if (result.rows.length === 0) {
            return res.json([]); // Return empty array if no orders found
        }

        const orders = result.rows.map(row => ({
            orderId: row[0],
            customerId: row[1],
            orderDate: row[2],
            orderStatus: row[3],
            totalPrice: row[4],
            customerName: row[5],
            customerPhone: row[6],
            deliveryAddress: row[7],
            deliveryStatus: row[8],
            paymentMethod: row[9] || 'Not specified',
            paymentStatus: row[10] || 'Pending',
            paymentAmount: row[11] || row[4] // Use total price if payment amount is null
        }));

        res.json(orders);
    } catch (error) {
        console.error('Error fetching delivery orders:', error);
        res.status(500).json({ error: 'Error fetching delivery orders' });
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

// Update delivery status endpoint
app.put('/api/delivery/orders/:orderId/status', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await oracledb.getConnection();
        const { status } = req.body;
        const { orderId } = req.params;
        const deliveryId = req.user.delivery_id;

        console.log('Updating status:', { orderId, deliveryId, status });

        // First verify the delivery exists and belongs to this delivery person
        const verifyResult = await conn.execute(
            `SELECT * FROM deliveries 
             WHERE order_id = :orderId 
             AND delivery_person_id = :deliveryId`,
            [orderId, deliveryId],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or unauthorized' });
        }

        // Update the delivery status and set delivery_time to current timestamp
        const result = await conn.execute(
            `UPDATE deliveries 
             SET delivery_status = :status,
                 delivery_time = CURRENT_TIMESTAMP
             WHERE order_id = :orderId 
             AND delivery_person_id = :deliveryId`,
            [status, orderId, deliveryId]
        );

        // If status is 'Delivered', update the order status to 'Completed'
        if (status === 'Delivered') {
            await conn.execute(
                `UPDATE orders 
                 SET order_status = 'Completed'
                 WHERE order_id = :orderId`,
                [orderId]
            );
        }

        // Commit the transaction
        await conn.commit();

        console.log('Update result:', result);

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Failed to update status' });
        }

        res.json({ message: 'Delivery status updated successfully' });
    } catch (error) {
        console.error('Error updating delivery status:', error);
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackError) {
                console.error('Error rolling back transaction:', rollbackError);
            }
        }
        res.status(500).json({ error: 'Error updating delivery status' });
    } finally {
        if (conn) {
            try {
                await conn.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

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
