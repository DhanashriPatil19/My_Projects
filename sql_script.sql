-- CREATE DATABASE IF NOT EXISTS agro_shop;
-- USE agro_shop;

-- Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'customer') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order Items Table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Insert Default Admin User (password: admin123)
INSERT INTO users (username, email, password, role) VALUES 
('Admin', 'admin@agroshop.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin');

-- Insert Sample Products
INSERT INTO products (name, category, description, price, stock, image_url) VALUES
('Organic Wheat Seeds', 'Seeds', 'High-quality organic wheat seeds for optimal yield', 299.99, 500, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400'),
('NPK Fertilizer 10-26-26', 'Fertilizers', 'Balanced NPK fertilizer for all crops', 899.50, 300, 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400'),
('Drip Irrigation Kit', 'Equipment', 'Complete drip irrigation system for 1 acre', 5499.00, 50, 'https://images.unsplash.com/photo-1625246371810-e8f6baf1e6dc?w=400'),
('Pesticide Spray Pump', 'Equipment', 'Manual pesticide spray pump - 16L capacity', 1299.00, 100, 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400'),
('Organic Compost', 'Fertilizers', 'Enriched organic compost for soil health', 399.00, 200, 'https://images.unsplash.com/photo-1597843786411-e7d0cf6ce6d6?w=400'),
('Tomato Seeds - Hybrid', 'Seeds', 'Disease resistant hybrid tomato seeds', 149.99, 800, 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400');