-- Dropping existing tables if they exist
drop table feedback;
drop table payment;
drop table deliveries;
drop table orders;
drop table delivery;
drop table customer;
drop table items;
drop table menu;
drop table employee;
drop table admin;
BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER update_item_price';
    EXECUTE IMMEDIATE 'DROP TRIGGER update_total_price_on_order';
    EXECUTE IMMEDIATE 'DROP TRIGGER update_payment_amount';
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if triggers don't exist
END;
/

-- Admin Table
CREATE TABLE admin(
    admin_id VARCHAR(5) PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    password VARCHAR(30) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('Manager', 'Supervisor'))
);

-- Employee Table
CREATE TABLE employee(
    employee_id VARCHAR(5) PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('Delivery', 'Chef', 'Manager')),
    phone_number NUMERIC(10,0) NOT NULL UNIQUE,
    salary NUMBER CHECK (salary > 0)
);

-- Create customer table
CREATE TABLE customer (
    customer_id VARCHAR(5) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(10) NOT NULL,
    address VARCHAR(200) NOT NULL,
    password VARCHAR(20) NOT NULL
);

-- Menu Table
CREATE TABLE menu (
    menu_id VARCHAR(5) PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Veg Starter', 'Non-Veg Starter', 'Veg Main Course', 'Non-Veg Main Course', 'Desserts', 'Drinks', 'International')),
    price NUMBER(10,2) NOT NULL CHECK (price > 0),
    description VARCHAR(500),
    availability_status VARCHAR(20) CHECK (availability_status IN ('Available', 'Not Available')),
    image_link VARCHAR(100)
);

--Items Table
CREATE TABLE items (
    item_id VARCHAR(5),
    menu_id VARCHAR(5) REFERENCES menu(menu_id),
    quantity NUMBER NOT NULL,
    price NUMBER NOT NULL,
    PRIMARY KEY (item_id, menu_id)
);


-- Order Table
CREATE TABLE orders(
    order_id VARCHAR(6) PRIMARY KEY,
    customer_id VARCHAR(5) REFERENCES customer(customer_id),
    item_id VARCHAR(5), --REFERENCES items(item_id),
    total_price NUMBER CHECK (total_price > 0),
    order_status VARCHAR(20) CHECK (order_status IN ('Pending', 'Processing', 'Completed', 'Cancelled')),
    order_date DATE DEFAULT SYSDATE
);

-- Create delivery table
CREATE TABLE delivery (
    delivery_id VARCHAR(5) PRIMARY KEY,
    employee_id VARCHAR(5) NOT NULL,
    rating NUMBER(2,1) CHECK (rating >= 1 AND rating <= 5),
    FOREIGN KEY (employee_id) REFERENCES employee(employee_id)
);

-- Create deliveries table
CREATE TABLE deliveries (
    delivery_id VARCHAR(5),
    order_id VARCHAR(5),
    delivery_person_id VARCHAR(5),
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('Out for Delivery', 'Delivered', 'Cancelled')),
    delivery_time TIMESTAMP,
    PRIMARY KEY (delivery_id, order_id),
    FOREIGN KEY (delivery_id) REFERENCES delivery(delivery_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (delivery_person_id) REFERENCES delivery(delivery_id)
);

-- Create payment table
CREATE TABLE payment (
    payment_id VARCHAR(5) PRIMARY KEY,
    order_id VARCHAR(5) NOT NULL,
    amount NUMBER(10,2) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('Completed', 'Pending', 'Failed')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('Credit Card', 'Debit Card', 'UPI', 'Cash')),
    transaction_date TIMESTAMP NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- Create feedback table
CREATE TABLE feedback (
    rating_id VARCHAR(5) PRIMARY KEY,
    order_id VARCHAR(5) NOT NULL,
    customer_id VARCHAR(5) NOT NULL,
    rating_score NUMBER(2,1) CHECK (rating_score >= 1 AND rating_score <= 5),
    feedback_text VARCHAR(500),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (customer_id) REFERENCES customer(customer_id)
);


CREATE OR REPLACE TRIGGER update_item_price
BEFORE INSERT OR UPDATE ON items
FOR EACH ROW
DECLARE
    menu_item_price NUMBER(10,2);
BEGIN
    -- Fetch the price from the menu table based on the menu_id
    SELECT price
    INTO menu_item_price
    FROM menu
    WHERE menu_id = :NEW.menu_id;

    -- If the price or quantity is updated, update the price of the item
    :NEW.price := menu_item_price * :NEW.quantity;
END;
/


CREATE OR REPLACE TRIGGER update_total_price_on_order
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
DECLARE
    total NUMBER;
BEGIN
    SELECT SUM(price)
    INTO total
    FROM items
    WHERE item_id = :NEW.item_id;

    :NEW.total_price := total;
END;
/

CREATE OR REPLACE TRIGGER update_payment_amount
BEFORE INSERT OR UPDATE ON payment
FOR EACH ROW
DECLARE
    order_total NUMBER;
BEGIN
    -- Get the total_price from orders table for the given order_id
    SELECT total_price
    INTO order_total
    FROM orders
    WHERE order_id = :NEW.order_id;

    -- Set the amount field to the fetched total_price
    :NEW.amount := order_total;
END;
/
