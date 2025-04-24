select table_name from user_tables;


INSERT INTO admin (admin_id, username, password, role) VALUES
('A001', 'raj_admin', 'Pass@123', 'Manager');
INSERT INTO admin (admin_id, username, password, role) VALUES
('A002', 'anita_super', 'Secure#456', 'Supervisor');


INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E001', 'Amit Sharma', 'Manager', 6009876543, 60000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E002', 'Rohan Verma', 'Chef', 6009876544, 35000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E003', 'Sita Nair', 'Chef', 6009876545, 34000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E004', 'Mohan Gupta', 'Delivery', 6009876546, 20000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E005', 'Vikram Das', 'Delivery', 6009876547, 21000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E006', 'Pooja Reddy', 'Manager', 6009876548, 60000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E007', 'Meera Kapoor', 'Chef', 6009876549, 35000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E008', 'Anjali Patil', 'Chef', 6009876550, 34000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E009', 'Sonia Singh', 'Delivery', 6009876551, 20000);
INSERT INTO employee (employee_id, name, role, phone_number, salary) VALUES
('E010', 'Naina Joshi', 'Delivery', 6009876552, 21000);


INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C001', 'Priya Iyer', 7009876543, 'priya.iyer@gmail.com', 'MIT Gate 2', 'priya123');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C002', 'Arjun Mehta', 7009876544, 'arjun.mehta@gmail.com', 'Tiger Circle', 'arjun456');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C003', 'Neha Raj', 7009876545, 'neha.raj@gmail.com', 'Padubidri', 'neha789');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C004', 'Karthik Rao', 7009876546, 'karthik.rao@gmail.com', 'Malpe', 'karthik321');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C005', 'Sonali Desai', 7009876547, 'sonali.desai@gmail.com', 'Syndicate Circle', 'sonali654');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C006', 'Ritika Jain', 7009876548, 'ritika.jain@gmail.com', 'MIT Gate 2', 'ritika456');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C007', 'Ravi Kumar', 7009876549, 'ravi.kumar@gmail.com', 'KMC Greens', 'ravi789');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C008', 'Tanvi Bhat', 7009876550, 'tanvi.bhat@gmail.com', 'Syndicate Circle', 'tanvi321');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C009', 'Rajesh Malhotra', 7009876551, 'rajesh.malhotra@gmail.com', 'Parkala', 'rajesh654');
INSERT INTO customer (customer_id, name, phone_number, email, address, password) VALUES
('C010', 'Simran Gill', 7009876552, 'simran.gill@gmail.com', 'Udupi', 'simran456');


INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M001', 'Veggie Delight Pizza', 'Veg Main Course', 199, 'Loaded veggie pizza', 'Available','images/pizza-1.png');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M002', 'Alfredo Pasta', 'Veg Main Course', 250, 'Creamy white sauce pasta', 'Available','images/alfredo pasta.webp');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M003', 'Cheese Hamburger', 'Veg Main Course', 150, 'Juicy burger with cheese', 'Available','images/burger-1.png');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M004', 'Tiramisu', 'Desserts', 200, 'Italian coffee-flavored dessert', 'Available','images/tiramisu.jpeg');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M005', 'Classic Cold Coffee', 'Drinks', 99, 'Chilled coffee with cream', 'Available','images/cold coffee.jpg');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M006', 'Fresh Lime Soda', 'Drinks', 40, 'Refreshing lemon soda', 'Available','images/fresh lime soda.jpeg');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M007', 'Spicy Chicken Wings', 'Non-Veg Starter', 100, 'Crispy spicy wings', 'Available','images/chicken wings.webp');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M008', 'Paneer Tikka', 'Veg Starter', 90, 'Grilled spiced paneer', 'Available','images/paneer tikka final 2.jpg');
INSERT INTO menu (menu_id, item_name, category, price, description, availability_status,image_link) VALUES
('M009', 'Gulab Jamun', 'Desserts', 79, 'Sweet-sugary fried balls', 'Available','images/gulab jamun.avif');


INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I001', 'M001', 2);
INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I002', 'M004', 1);
INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I003', 'M005', 3);
INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I004', 'M002', 1);
INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I005', 'M006', 2);
INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I006', 'M007', 1);
INSERT INTO items (item_id, menu_id, quantity) 
VALUES ('I007', 'M008', 1);



INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date) 
VALUES ('O001', 'C001', 'I001', 'Completed', TO_DATE('2024-03-25', 'YYYY-MM-DD'));
INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date) 
VALUES ('O002', 'C002', 'I002', 'Processing', TO_DATE('2024-03-26', 'YYYY-MM-DD'));
INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date)
VALUES ('O003', 'C003', 'I003', 'Completed', TO_DATE('2024-03-27', 'YYYY-MM-DD'));
INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date) 
VALUES ('O004', 'C004', 'I004', 'Processing', TO_DATE('2024-03-28', 'YYYY-MM-DD'));
INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date) 
VALUES ('O005', 'C005', 'I005', 'Cancelled', TO_DATE('2024-03-29', 'YYYY-MM-DD'));
INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date)
VALUES ('O006', 'C006', 'I006', 'Completed', TO_DATE('2024-03-30', 'YYYY-MM-DD'));
INSERT INTO orders (order_id, customer_id, item_id, order_status, order_date) 
VALUES ('O007', 'C007', 'I007', 'Processing', TO_DATE('2024-03-31', 'YYYY-MM-DD'));


INSERT INTO delivery (delivery_id, employee_id, password, rating) VALUES
('D001', 'E004','pass004', 4.5);
INSERT INTO delivery (delivery_id, employee_id, password,rating) VALUES
('D002', 'E005','hello06', 4.8);
INSERT INTO delivery (delivery_id, employee_id, password, rating) VALUES
('D003', 'E009', 'Pass88',4.6);
INSERT INTO delivery (delivery_id, employee_id, password, rating) VALUES
('D004', 'E010', 'hello05',4.7);


INSERT INTO deliveries (delivery_id, order_id, delivery_person_id, delivery_status, delivery_time) VALUES
('D001', 'O001', 'D001', 'Delivered', TO_TIMESTAMP('2024-03-25 14:30:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO deliveries (delivery_id, order_id, delivery_person_id, delivery_status, delivery_time) VALUES
('D002', 'O003', 'D002', 'Delivered', TO_TIMESTAMP('2024-03-27 16:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO deliveries (delivery_id, order_id, delivery_person_id, delivery_status, delivery_time) VALUES
('D003', 'O006', 'D003', 'Delivered', TO_TIMESTAMP('2024-03-30 18:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO deliveries (delivery_id, order_id, delivery_person_id, delivery_status, delivery_time) VALUES
('D004', 'O007', 'D004', 'Out for Delivery', NULL);


INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P001', 'O001', 'Completed', 'Credit Card', TO_TIMESTAMP('2024-03-25 14:30:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P002', 'O002', 'Pending', 'UPI', TO_TIMESTAMP('2024-03-26 10:15:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P003', 'O003', 'Completed', 'Debit Card', TO_TIMESTAMP('2024-03-27 16:45:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P004', 'O004', 'Pending', 'Cash', TO_TIMESTAMP('2024-03-28 12:20:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P005', 'O005', 'Failed', 'Credit Card', TO_TIMESTAMP('2024-03-29 09:10:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P006', 'O006', 'Completed', 'UPI', TO_TIMESTAMP('2024-03-30 18:00:00', 'YYYY-MM-DD HH24:MI:SS'));
INSERT INTO payment (payment_id, order_id, payment_status, payment_method, transaction_date) 
VALUES ('P007', 'O007', 'Pending', 'Debit Card', TO_TIMESTAMP('2024-03-31 15:50:00', 'YYYY-MM-DD HH24:MI:SS'));



INSERT INTO feedback (rating_id, order_id, customer_id, rating_score, feedback_text) VALUES
('F001', 'O001', 'C001', 4.8, 'Delicious and fresh');
INSERT INTO feedback (rating_id, order_id, customer_id, rating_score, feedback_text) VALUES
('F002', 'O003', 'C003', 4.5, 'So tasty');
INSERT INTO feedback (rating_id, order_id, customer_id, rating_score, feedback_text) VALUES
('F003', 'O006', 'C006', 4.7, 'Crispy and Yummy');



select * from admin;
select * from employee;
select * from customer;
select * from menu;
select * from orders;
select * from delivery;
select * from deliveries;
select * from payment;
select * from feedback;





















