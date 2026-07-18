-- ====================================================================
-- ServeMe Database Schema (MySQL Optimized)
-- Specifically tuned for high-concurrency QR ordering & KDS systems.
-- ====================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS serveme_db;
USE serveme_db;

-- Main orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Sequential, user-friendly Order ID (e.g. ORD-001)
    -- Allocated ONLY after successful Stripe webhook confirmation
    order_id VARCHAR(20) UNIQUE NULL, 
    
    -- Tracks the device/browser table session
    customer_session_id VARCHAR(255) NULL,
    
    -- Dense JSON array containing order items to minimize JOIN lookups for KDS
    items JSON NOT NULL,
    
    -- Precise transaction amount
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Workflow statuses
    status ENUM('pending_payment', 'paid', 'preparing', 'ready', 'completed') DEFAULT 'pending_payment' NOT NULL,
    
    -- Stripe transaction matching key
    payment_intent_id VARCHAR(255) UNIQUE NULL,
    
    -- Standard record timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,

    -- PERFORMANCE INDEXES --
    -- 1. Fast lookup of active preparing/ready orders for the Kitchen Display System (KDS)
    INDEX idx_orders_status (status),
    
    -- 2. Fast lookup of orders created on a specific date (for reports and dashboards)
    INDEX idx_orders_created_at (created_at),
    
    -- 3. Fast lookup of table-specific orders
    INDEX idx_orders_session (customer_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Optimized Sequence / Counter Table (Alternative to locking the main table)
-- Highly recommended for ultra-high transaction volume to avoid any bottlenecks on the main table locks.
CREATE TABLE IF NOT EXISTS order_counters (
    counter_name VARCHAR(50) PRIMARY KEY,
    last_value INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- Insert initial sequence count
INSERT INTO order_counters (counter_name, last_value) 
VALUES ('order_sequence', 0)
ON DUPLICATE KEY UPDATE counter_name=counter_name;
