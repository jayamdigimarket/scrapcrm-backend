-- ============================================================
-- ScrapCRM — Scrap & Recycling Industry ERP
-- Client: MVR Polyplast, Visakhapatnam
-- Developed by: Jayamm Technologies | +91-9445155934
-- Version: 1.0.0 | Date: July 2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS scrapcrm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE scrapcrm;

-- ── BRANCHES ─────────────────────────────────────────────
CREATE TABLE branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(100),
  gst_number VARCHAR(20),
  msme_number VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO branches (name, address, city, state, pincode, phone, email, gst_number, msme_number) VALUES
('Visakhapatnam', 'D No:17-46-4/1, Kongapalem, Pedagantyada', 'Visakhapatnam', 'Andhra Pradesh', '530044', '6305064899', 'info@mvrpolyplast.com', '37ACDFM0167F1ZE', 'UDYAM-AP-10-0103793');

-- ── USERS ────────────────────────────────────────────────
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('superadmin','admin','manager','staff') DEFAULT 'staff',
  branch_id INT,
  phone VARCHAR(20),
  is_active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Default admin password: Admin@1234 (change after first login)
INSERT INTO users (name, email, password, role, branch_id) VALUES
('Administrator', 'admin@mvrpolyplast.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'superadmin', 1);

-- ── DOCUMENT NUMBER SERIES ───────────────────────────────
CREATE TABLE doc_series (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  doc_type ENUM('INV','PO','CN','DN','DC','REC') NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  financial_year VARCHAR(10) NOT NULL,
  last_number INT DEFAULT 0,
  UNIQUE KEY unique_series (branch_id, doc_type, financial_year),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

INSERT INTO doc_series (branch_id, doc_type, prefix, financial_year, last_number) VALUES
(1, 'INV', 'MVR/INV', '26-27', 0),
(1, 'PO',  'MVR/PO',  '26-27', 0),
(1, 'CN',  'MVR/CN',  '26-27', 0),
(1, 'DN',  'MVR/DN',  '26-27', 0),
(1, 'DC',  'MVR/DC',  '26-27', 0),
(1, 'REC', 'MVR/REC', '26-27', 0);

-- ── CUSTOMERS ────────────────────────────────────────────
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  business_name VARCHAR(150),
  gst_number VARCHAR(20),
  pan_number VARCHAR(15),
  phone VARCHAR(20),
  email VARCHAR(100),
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  balance_type ENUM('debit','credit') DEFAULT 'debit',
  payment_terms INT DEFAULT 7,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ── SUPPLIERS ────────────────────────────────────────────
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  business_name VARCHAR(150),
  supplier_type ENUM('Scrap Shop','Baler','Bales & Chips','Trader','Other') DEFAULT 'Other',
  gst_registered TINYINT(1) DEFAULT 0,
  gst_number VARCHAR(20),
  pan_number VARCHAR(15),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  balance_type ENUM('debit','credit') DEFAULT 'credit',
  payment_terms INT DEFAULT 7,
  is_active TINYINT(1) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ── MATERIALS ────────────────────────────────────────────
CREATE TABLE materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  hsn_code VARCHAR(20),
  unit VARCHAR(20) DEFAULT 'Kg',
  purchase_rate DECIMAL(10,2) DEFAULT 0,
  sale_rate DECIMAL(10,2) DEFAULT 0,
  gst_rate DECIMAL(5,2) DEFAULT 18,
  current_stock DECIMAL(15,3) DEFAULT 0,
  min_stock DECIMAL(15,3) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

INSERT INTO materials (branch_id, name, hsn_code, unit, purchase_rate, sale_rate, gst_rate, current_stock, min_stock) VALUES
(1, 'PET Bales - Natural',  '39159042', 'Kg', 42, 47, 18, 0, 5000),
(1, 'HDPE Scrap',           '3915',     'Kg', 26, 30, 18, 0, 2000),
(1, 'LDPE Scrap',           '3915',     'Kg', 22, 25, 18, 0, 3000),
(1, 'PP Scrap',             '3915',     'Kg', 18, 20, 18, 0, 2000),
(1, 'PET Chips',            '39159042', 'Kg', 55, 62, 18, 0, 1000);

-- ── PURCHASE ORDERS ──────────────────────────────────────
CREATE TABLE purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  po_number VARCHAR(30) UNIQUE NOT NULL,
  po_date DATE NOT NULL,
  supplier_id INT NOT NULL,
  supplier_type ENUM('GST','Non-GST') DEFAULT 'Non-GST',
  is_auto_generated TINYINT(1) DEFAULT 0,
  linked_purchase_id INT NULL,
  subtotal DECIMAL(15,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  payment_terms INT DEFAULT 7,
  incoterms VARCHAR(50),
  terms_conditions TEXT,
  status ENUM('Draft','Sent','Received','Partial','Cancelled') DEFAULT 'Draft',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_id INT NOT NULL,
  material_id INT NOT NULL,
  description VARCHAR(200),
  hsn_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  taxable_value DECIMAL(15,2) NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ── PURCHASES ────────────────────────────────────────────
CREATE TABLE purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  purchase_number VARCHAR(30) UNIQUE NOT NULL,
  purchase_date DATE NOT NULL,
  supplier_id INT NOT NULL,
  po_id INT NULL,
  vehicle_number VARCHAR(20),
  driver_name VARCHAR(100),
  subtotal DECIMAL(15,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) DEFAULT 0,
  payment_status ENUM('Unpaid','Partial','Paid') DEFAULT 'Unpaid',
  payment_terms INT DEFAULT 7,
  due_date DATE,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  material_id INT NOT NULL,
  hsn_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  taxable_value DECIMAL(15,2) NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ── INVOICES ─────────────────────────────────────────────
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  customer_id INT NOT NULL,
  bill_to_address TEXT,
  ship_to_address TEXT,
  po_reference VARCHAR(100),
  po_date DATE,
  vehicle_number VARCHAR(20),
  incoterms VARCHAR(50) DEFAULT 'FOB Road',
  subtotal DECIMAL(15,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  amount_in_words TEXT,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) DEFAULT 0,
  payment_status ENUM('Unpaid','Partial','Paid') DEFAULT 'Unpaid',
  payment_terms INT DEFAULT 7,
  due_date DATE,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  material_id INT NOT NULL,
  description VARCHAR(200),
  hsn_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  taxable_value DECIMAL(15,2) NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ── CREDIT NOTES ─────────────────────────────────────────
CREATE TABLE credit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  cn_number VARCHAR(30) UNIQUE NOT NULL,
  cn_date DATE NOT NULL,
  customer_id INT NOT NULL,
  invoice_id INT NOT NULL,
  reason TEXT,
  subtotal DECIMAL(15,2) DEFAULT 0,
  cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status ENUM('Pending','Applied','Partial') DEFAULT 'Pending',
  applied_amount DECIMAL(15,2) DEFAULT 0,
  auto_generated TINYINT(1) DEFAULT 0,
  vendor_dn_file VARCHAR(255),
  email_sent TINYINT(1) DEFAULT 0,
  whatsapp_sent TINYINT(1) DEFAULT 0,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE credit_note_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cn_id INT NOT NULL,
  material_id INT NOT NULL,
  hsn_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  taxable_value DECIMAL(15,2) NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 0, cgst_amount DECIMAL(15,2) DEFAULT 0,
  sgst_rate DECIMAL(5,2) DEFAULT 0, sgst_amount DECIMAL(15,2) DEFAULT 0,
  igst_rate DECIMAL(5,2) DEFAULT 0, igst_amount DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (cn_id) REFERENCES credit_notes(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ── DEBIT NOTES ──────────────────────────────────────────
CREATE TABLE debit_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  dn_number VARCHAR(30) UNIQUE NOT NULL,
  dn_date DATE NOT NULL,
  supplier_id INT NOT NULL,
  purchase_id INT NOT NULL,
  reason TEXT,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status ENUM('Pending','Applied','Partial') DEFAULT 'Pending',
  applied_amount DECIMAL(15,2) DEFAULT 0,
  vendor_dn_file VARCHAR(255),
  linked_cn_id INT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);

-- ── DELIVERY CHALLANS ────────────────────────────────────
CREATE TABLE delivery_challans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  challan_number VARCHAR(30) UNIQUE NOT NULL,
  challan_date DATE NOT NULL,
  invoice_id INT NULL,
  customer_id INT NOT NULL,
  vehicle_number VARCHAR(20),
  driver_name VARCHAR(100),
  driver_contact VARCHAR(20),
  transporter_name VARCHAR(100),
  total_quantity DECIMAL(15,3) DEFAULT 0,
  total_value DECIMAL(15,2) DEFAULT 0,
  status ENUM('Draft','Dispatched','Delivered') DEFAULT 'Draft',
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE challan_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challan_id INT NOT NULL,
  material_id INT NOT NULL,
  hsn_code VARCHAR(20),
  quantity DECIMAL(15,3) NOT NULL,
  rate DECIMAL(10,2) DEFAULT 0,
  value DECIMAL(15,2) DEFAULT 0,
  FOREIGN KEY (challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ── PAYMENTS ─────────────────────────────────────────────
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  payment_number VARCHAR(30) UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  party_type ENUM('customer','supplier') NOT NULL,
  party_id INT NOT NULL,
  payment_mode ENUM('Cash','Bank Transfer','UPI','Cheque','RTGS','NEFT') DEFAULT 'Bank Transfer',
  amount DECIMAL(15,2) NOT NULL,
  reference_number VARCHAR(100),
  bank_account_id INT,
  invoice_id INT NULL,
  purchase_id INT NULL,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ── BANK ACCOUNTS ────────────────────────────────────────
CREATE TABLE bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100),
  account_number VARCHAR(30),
  ifsc_code VARCHAR(20),
  branch_name VARCHAR(100),
  account_type ENUM('Current','Savings') DEFAULT 'Current',
  is_gst_account TINYINT(1) DEFAULT 0,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

INSERT INTO bank_accounts (branch_id, account_name, bank_name, account_number, ifsc_code, branch_name, is_gst_account, current_balance) VALUES
(1, 'IOB Current Account', 'Indian Overseas Bank', '260602000000392', 'IOBA0002606', 'Jaggu Junction, Visakhapatnam', 1, 0.00);

-- ── EXPENSES ─────────────────────────────────────────────
CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(100),
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  payment_mode ENUM('Cash','Bank Transfer','UPI','Cheque') DEFAULT 'Cash',
  bank_account_id INT NULL,
  receipt_file VARCHAR(255),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ── STOCK MOVEMENTS ──────────────────────────────────────
CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  material_id INT NOT NULL,
  movement_type ENUM('Purchase','Sale','Production In','Production Out','Adjustment','Return') NOT NULL,
  reference_type ENUM('purchase','invoice','production','adjustment','challan') NOT NULL,
  reference_id INT NOT NULL,
  quantity DECIMAL(15,3) NOT NULL,
  rate DECIMAL(10,2) DEFAULT 0,
  value DECIMAL(15,2) DEFAULT 0,
  balance_after DECIMAL(15,3) NOT NULL,
  movement_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);

-- ── PRODUCTION ───────────────────────────────────────────
CREATE TABLE production_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  production_date DATE NOT NULL,
  shift ENUM('Morning','Evening','Night') DEFAULT 'Morning',
  input_material_id INT,
  input_quantity DECIMAL(15,3),
  output_material_id INT,
  output_quantity DECIMAL(15,3),
  wastage_quantity DECIMAL(15,3) DEFAULT 0,
  operator_name VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (input_material_id) REFERENCES materials(id),
  FOREIGN KEY (output_material_id) REFERENCES materials(id)
);

-- ── ATTENDANCE ───────────────────────────────────────────
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  designation VARCHAR(100),
  phone VARCHAR(20),
  daily_wage DECIMAL(10,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  employee_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present','Absent','Half Day','Leave') DEFAULT 'Present',
  in_time TIME,
  out_time TIME,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  wage_amount DECIMAL(10,2) DEFAULT 0,
  notes VARCHAR(200),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_attendance (employee_id, attendance_date),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ── SETTINGS ─────────────────────────────────────────────
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  UNIQUE KEY unique_setting (branch_id, setting_key),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

INSERT INTO settings (branch_id, setting_key, setting_value) VALUES
(1, 'company_name',      'MVR Polyplast'),
(1, 'company_address',   'D No:17-46-4/1, Kongapalem, Pedagantyada, Visakhapatnam, Andhra Pradesh - 530044'),
(1, 'company_gst',       '37ACDFM0167F1ZE'),
(1, 'company_msme',      'UDYAM-AP-10-0103793'),
(1, 'company_phone',     '6305064899'),
(1, 'company_email',     'info@mvrpolyplast.com'),
(1, 'app_name',          'ScrapCRM'),
(1, 'invoice_prefix',    'MVR/INV'),
(1, 'po_prefix',         'MVR/PO'),
(1, 'cn_prefix',         'MVR/CN'),
(1, 'dn_prefix',         'MVR/DN'),
(1, 'dc_prefix',         'MVR/DC'),
(1, 'financial_year',    '26-27'),
(1, 'smtp_host',         ''),
(1, 'smtp_port',         '587'),
(1, 'smtp_user',         ''),
(1, 'smtp_pass',         ''),
(1, 'razorpay_key',      ''),
(1, 'razorpay_secret',   ''),
(1, 'supplier_alert_days', '7');

-- ── NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  reference_id INT,
  reference_type VARCHAR(50),
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- ── USEFUL VIEWS ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_supplier_last_receipt AS
SELECT s.id, s.name, s.supplier_type, s.branch_id,
  MAX(p.purchase_date) AS last_receipt_date,
  DATEDIFF(CURDATE(), MAX(p.purchase_date)) AS days_since_receipt
FROM suppliers s
LEFT JOIN purchases p ON p.supplier_id = s.id
WHERE s.is_active = 1
GROUP BY s.id;

CREATE OR REPLACE VIEW v_customer_outstanding AS
SELECT c.id, c.name, c.branch_id,
  COALESCE(SUM(i.balance_due), 0) AS total_outstanding
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id AND i.payment_status != 'Paid'
WHERE c.is_active = 1
GROUP BY c.id;

CREATE OR REPLACE VIEW v_stock_status AS
SELECT id, name, hsn_code, unit, current_stock, min_stock,
  CASE WHEN current_stock <= 0 THEN 'Critical'
       WHEN current_stock <= min_stock THEN 'Low'
       ELSE 'Good' END AS status
FROM materials WHERE is_active = 1;

-- ============================================================
-- ScrapCRM Database Setup Complete!
-- Default Login: admin@mvrpolyplast.com / Admin@1234
-- Developed by: Jayamm Technologies | +91-9445155934
-- ============================================================
