-- First, create required sequences

CREATE SEQUENCE order_id_seq
    START WITH 8
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- Drop existing triggers if they exist
BEGIN
    EXECUTE IMMEDIATE 'DROP TRIGGER update_order_status';
    EXECUTE IMMEDIATE 'DROP TRIGGER check_menu_availability';
    EXECUTE IMMEDIATE 'DROP TRIGGER generate_order_id';
    EXECUTE IMMEDIATE 'DROP TRIGGER validate_phone_number';
    EXECUTE IMMEDIATE 'DROP TRIGGER validate_email';
    EXECUTE IMMEDIATE 'DROP TRIGGER prevent_negative_price';
    EXECUTE IMMEDIATE 'DROP TRIGGER update_order_total';
    EXECUTE IMMEDIATE 'DROP TRIGGER prevent_duplicate_orders';
    EXECUTE IMMEDIATE 'DROP TRIGGER prevent_cancellation';
    EXECUTE IMMEDIATE 'DROP TRIGGER validate_delivery_time';
    EXECUTE IMMEDIATE 'DROP TRIGGER prevent_menu_deletion';
    EXECUTE IMMEDIATE 'DROP TRIGGER update_loyalty_points';
    EXECUTE IMMEDIATE 'DROP TRIGGER prevent_order_modification';
    EXECUTE IMMEDIATE 'DROP TRIGGER validate_order_quantity';
    EXECUTE IMMEDIATE 'DROP TRIGGER prevent_customer_deletion';
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if triggers don't exist
END;
/

-- Now create the triggers
-- Trigger to automatically update order status when payment is made
CREATE OR REPLACE TRIGGER update_order_status
AFTER INSERT ON payment
FOR EACH ROW
BEGIN
    UPDATE orders
    SET order_status = 'Paid'
    WHERE order_id = :NEW.order_id;
END;
/

-- Trigger to check menu item availability before order
CREATE OR REPLACE TRIGGER check_menu_availability
BEFORE INSERT ON orders
FOR EACH ROW
DECLARE
    v_status VARCHAR2(20);
BEGIN
    SELECT availability_status INTO v_status
    FROM menu
    WHERE menu_id = :NEW.menu_id;
    
    IF v_status != 'Available' THEN
        RAISE_APPLICATION_ERROR(-20001, 'Menu item is not available');
    END IF;
END;
/

-- Trigger to generate order ID
CREATE OR REPLACE TRIGGER generate_order_id
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    SELECT 'O' || LPAD(TO_CHAR(order_id_seq.NEXTVAL), 3, '0')
    INTO :NEW.order_id
    FROM dual;
END;
/

-- Trigger to validate phone number format
CREATE OR REPLACE TRIGGER validate_phone_number
BEFORE INSERT OR UPDATE ON customer
FOR EACH ROW
BEGIN
    IF NOT REGEXP_LIKE(:NEW.phone_number, '^[0-9]{10}$') THEN
        RAISE_APPLICATION_ERROR(-20003, 'Invalid phone number format. Must be 10 digits.');
    END IF;
END;
/

-- Trigger to validate email format
CREATE OR REPLACE TRIGGER validate_email
BEFORE INSERT OR UPDATE ON customer
FOR EACH ROW
BEGIN
    IF NOT REGEXP_LIKE(:NEW.email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
        RAISE_APPLICATION_ERROR(-20004, 'Invalid email format');
    END IF;
END;
/

-- Trigger to prevent negative prices
CREATE OR REPLACE TRIGGER prevent_negative_price
BEFORE INSERT OR UPDATE ON menu
FOR EACH ROW
BEGIN
    IF :NEW.price < 0 THEN
        RAISE_APPLICATION_ERROR(-20005, 'Price cannot be negative');
    END IF;
END;
/

-- Trigger to update total price when order quantity changes
CREATE OR REPLACE TRIGGER update_order_total
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
DECLARE
    v_price NUMBER;
BEGIN
    SELECT price INTO v_price
    FROM menu
    WHERE menu_id = :NEW.menu_id;
    
    :NEW.total_price := v_price * :NEW.quantity;
END;
/

-- Trigger to prevent duplicate orders
CREATE OR REPLACE TRIGGER prevent_duplicate_orders
BEFORE INSERT ON orders
FOR EACH ROW
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE customer_id = :NEW.customer_id
    AND menu_id = :NEW.menu_id
    AND order_status = 'Pending';
    
    IF v_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20007, 'Duplicate order detected');
    END IF;
END;
/

-- Trigger to prevent order cancellation after preparation
CREATE OR REPLACE TRIGGER prevent_cancellation
BEFORE UPDATE OF order_status ON orders
FOR EACH ROW
BEGIN
    IF :OLD.order_status = 'Preparing' AND :NEW.order_status = 'Cancelled' THEN
        RAISE_APPLICATION_ERROR(-20008, 'Cannot cancel order that is already being prepared');
    END IF;
END;
/

-- Trigger to prevent menu item deletion if ordered
CREATE OR REPLACE TRIGGER prevent_menu_deletion
BEFORE DELETE ON menu
FOR EACH ROW
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE menu_id = :OLD.menu_id;
    
    IF v_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Cannot delete menu item that has been ordered');
    END IF;
END;
/

-- Trigger to prevent order modification after delivery
CREATE OR REPLACE TRIGGER prevent_order_modification
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    IF :OLD.order_status = 'Delivered' THEN
        RAISE_APPLICATION_ERROR(-20011, 'Cannot modify delivered orders');
    END IF;
END;
/

-- Trigger to validate order quantity
CREATE OR REPLACE TRIGGER validate_order_quantity
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
BEGIN
    IF :NEW.quantity < 1 THEN
        RAISE_APPLICATION_ERROR(-20012, 'Order quantity must be at least 1');
    END IF;
    
    IF :NEW.quantity > 99 THEN
        RAISE_APPLICATION_ERROR(-20013, 'Order quantity cannot exceed 99');
    END IF;
END;
/

-- Trigger to prevent customer deletion with active orders
CREATE OR REPLACE TRIGGER prevent_customer_deletion
BEFORE DELETE ON customer
FOR EACH ROW
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE customer_id = :OLD.customer_id
    AND order_status IN ('Pending', 'Preparing', 'Ready');
    
    IF v_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20014, 'Cannot delete customer with active orders');
    END IF;
END;
/