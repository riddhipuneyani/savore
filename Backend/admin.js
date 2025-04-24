// Get all customers
app.get('/api/admin/customers', authenticateAdmin, async (req, res) => {
    try {
        const [customers] = await pool.query(`
            SELECT 
                c.CUSTOMER_ID,
                c.NAME,
                c.EMAIL,
                c.PHONE_NUMBER,
                COUNT(o.ORDER_ID) as ORDER_COUNT
            FROM CUSTOMERS c
            LEFT JOIN ORDERS o ON c.CUSTOMER_ID = o.CUSTOMER_ID
            GROUP BY c.CUSTOMER_ID, c.NAME, c.EMAIL, c.PHONE_NUMBER
            ORDER BY c.NAME
        `);
        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Error fetching customers' });
    }
});

// Delete customer
app.delete('/api/admin/customers/:customerId', authenticateAdmin, async (req, res) => {
    const { customerId } = req.params;
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();

        // Check if customer has any orders
        const [orders] = await connection.query(
            'SELECT COUNT(*) as count FROM ORDERS WHERE CUSTOMER_ID = ?',
            [customerId]
        );

        if (orders[0].count > 0) {
            throw new Error('Cannot delete customer with existing orders');
        }

        // Delete customer
        await connection.query('DELETE FROM CUSTOMERS WHERE CUSTOMER_ID = ?', [customerId]);
        
        await connection.commit();
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
}); 