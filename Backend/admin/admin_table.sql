-- Create admin table
CREATE TABLE admin (
    admin_id VARCHAR2(10) PRIMARY KEY,
    username VARCHAR2(50) UNIQUE NOT NULL,
    password VARCHAR2(100) NOT NULL,
    name VARCHAR2(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user
INSERT INTO admin (admin_id, username, password, name) 
VALUES ('A001', 'admin', 'admin123', 'System Administrator');

COMMIT; 