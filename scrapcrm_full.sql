-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: railway
-- ------------------------------------------------------
-- Server version	9.7.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('Present','Absent','Half Day','Leave') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Present',
  `in_time` time DEFAULT NULL,
  `out_time` time DEFAULT NULL,
  `overtime_hours` decimal(4,2) DEFAULT '0.00',
  `wage_amount` decimal(10,2) DEFAULT '0.00',
  `notes` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `target_achieved` tinyint(1) DEFAULT '0',
  `target_description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_attendance` (`employee_id`,`attendance_date`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `account_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsc_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_type` enum('Current','Savings') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Current',
  `is_gst_account` tinyint(1) DEFAULT '0',
  `opening_balance` decimal(15,2) DEFAULT '0.00',
  `current_balance` decimal(15,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `bank_accounts_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branches`
--

DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `msme_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branches`
--

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES (1,'Visakhapatnam','D No:17-46-4/1, Kongapalem, Pedagantyada','Visakhapatnam','Andhra Pradesh','530044','6305064899','info@mvrpolyplast.com','37ACDFM0167F1ZE','UDYAM-AP-10-0103793',1,'2026-07-25 13:31:19'),(2,'Hyderabad','Flat No 5, Industrial Area, Nacharam','Hyderabad','Telangana',NULL,'9876543210',NULL,'36ACDFM0167F1ZE',NULL,1,'2026-08-08 07:19:22');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `challan_items`
--

DROP TABLE IF EXISTS `challan_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `challan_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `challan_id` int NOT NULL,
  `material_id` int NOT NULL,
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `rate` decimal(10,2) DEFAULT '0.00',
  `value` decimal(15,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `challan_id` (`challan_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `challan_items_ibfk_1` FOREIGN KEY (`challan_id`) REFERENCES `delivery_challans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `challan_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challan_items`
--

LOCK TABLES `challan_items` WRITE;
/*!40000 ALTER TABLE `challan_items` DISABLE KEYS */;
INSERT INTO `challan_items` VALUES (1,1,3,'3915',12.000,25.00,300.00),(2,2,3,'3915',12.000,25.00,300.00);
/*!40000 ALTER TABLE `challan_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_note_items`
--

DROP TABLE IF EXISTS `credit_note_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_note_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cn_id` int NOT NULL,
  `material_id` int NOT NULL,
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `taxable_value` decimal(15,2) NOT NULL,
  `cgst_rate` decimal(5,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_rate` decimal(5,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_rate` decimal(5,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_value` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cn_id` (`cn_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `credit_note_items_ibfk_1` FOREIGN KEY (`cn_id`) REFERENCES `credit_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `credit_note_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_note_items`
--

LOCK TABLES `credit_note_items` WRITE;
/*!40000 ALTER TABLE `credit_note_items` DISABLE KEYS */;
INSERT INTO `credit_note_items` VALUES (1,2,2,'3915',12.000,30.00,360.00,9.00,32.40,9.00,32.40,0.00,0.00,424.80),(3,4,1,'39159042',200.000,53.00,10600.00,9.00,954.00,9.00,954.00,0.00,0.00,12508.00),(4,1,1,'39159042',260.000,53.00,13780.00,9.00,1240.20,9.00,1240.20,0.00,0.00,16260.40),(5,1,1,'39159042',143.620,6.00,861.72,9.00,77.55,9.00,77.55,0.00,0.00,1016.83),(6,1,1,'39159042',1.000,7109.00,7109.00,9.00,639.81,9.00,639.81,0.00,0.00,8388.62),(7,1,1,'39159042',1.000,323.00,323.00,9.00,29.07,9.00,29.07,0.00,0.00,381.14),(8,1,1,'39159042',40.000,10.00,400.00,9.00,36.00,9.00,36.00,0.00,0.00,472.00);
/*!40000 ALTER TABLE `credit_note_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credit_notes`
--

DROP TABLE IF EXISTS `credit_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `cn_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cn_date` date NOT NULL,
  `customer_id` int NOT NULL,
  `invoice_id` int NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('Pending','Applied','Partial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `applied_amount` decimal(15,2) DEFAULT '0.00',
  `auto_generated` tinyint(1) DEFAULT '0',
  `vendor_dn_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_sent` tinyint(1) DEFAULT '0',
  `whatsapp_sent` tinyint(1) DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `their_dn_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `their_dn_date` date DEFAULT NULL,
  `their_dn_amount` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cn_number` (`cn_number`),
  KEY `branch_id` (`branch_id`),
  KEY `customer_id` (`customer_id`),
  KEY `invoice_id` (`invoice_id`),
  CONSTRAINT `credit_notes_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `credit_notes_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `credit_notes_ibfk_3` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credit_notes`
--

LOCK TABLES `credit_notes` WRITE;
/*!40000 ALTER TABLE `credit_notes` DISABLE KEYS */;
INSERT INTO `credit_notes` VALUES (1,1,'MVR/CN/001/26-27','2026-08-30',1,1,'',22473.72,2022.63,2022.63,0.00,26518.99,'Applied',26518.99,0,NULL,0,0,1,'2026-09-19 14:41:50','RDRM2627-824','2026-08-10',26520.00);
/*!40000 ALTER TABLE `credit_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_advances`
--

DROP TABLE IF EXISTS `customer_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `adjusted_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_mode` varchar(50) DEFAULT 'Cash',
  `reference_number` varchar(100) DEFAULT '',
  `advance_date` date NOT NULL,
  `notes` text,
  `status` enum('Pending','Partial','Adjusted') DEFAULT 'Pending',
  `invoice_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_advances`
--

LOCK TABLES `customer_advances` WRITE;
/*!40000 ALTER TABLE `customer_advances` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_advances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_po_items`
--

DROP TABLE IF EXISTS `customer_po_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_po_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_id` int NOT NULL,
  `material_id` int NOT NULL,
  `hsn_code` varchar(20) DEFAULT '',
  `quantity` decimal(10,3) DEFAULT '0.000',
  `unit` varchar(20) DEFAULT 'Kg',
  `rate` decimal(10,2) DEFAULT '0.00',
  `taxable_value` decimal(12,2) DEFAULT '0.00',
  `total_value` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `po_id` (`po_id`),
  CONSTRAINT `customer_po_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `customer_pos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_po_items`
--

LOCK TABLES `customer_po_items` WRITE;
/*!40000 ALTER TABLE `customer_po_items` DISABLE KEYS */;
INSERT INTO `customer_po_items` VALUES (1,1,7,'39159042',18000.000,'Kg',53.00,954000.00,1297440.00),(3,3,1,'39159042',18000.000,'Kg',53.00,954000.00,1297440.00),(4,4,1,'39159042',18000.000,'Kg',63.00,1134000.00,1338120.00),(6,6,2,'3915',500.000,'Kg',30.00,15000.00,17700.00),(7,7,4,'3915',200.000,'Kg',20.00,4000.00,4720.00);
/*!40000 ALTER TABLE `customer_po_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_pos`
--

DROP TABLE IF EXISTS `customer_pos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_pos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `customer_id` int NOT NULL,
  `po_number` varchar(100) NOT NULL,
  `po_date` date NOT NULL,
  `delivery_date` date DEFAULT NULL,
  `payment_terms` varchar(100) DEFAULT '',
  `total_amount` decimal(12,2) DEFAULT '0.00',
  `notes` text,
  `status` enum('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `buyer_address` text,
  `shipping_address` text,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_branch` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_pos`
--

LOCK TABLES `customer_pos` WRITE;
/*!40000 ALTER TABLE `customer_pos` DISABLE KEYS */;
INSERT INTO `customer_pos` VALUES (1,2,3,'Email DT :5/8/26','2026-08-05','2026-08-10','7 Day from date of Invoice',1297440.00,'','Pending',1,'2026-08-31 16:45:38',NULL,NULL),(3,1,1,'Email Dated 5/08/26','2026-08-05','2026-08-15','7 Days from date of arrival',1297440.00,'','Pending',1,'2026-09-19 14:19:55',NULL,NULL),(4,1,1,'PO 1234','2026-10-14','2026-10-24','7 days from date of receipt',1338120.00,'','Pending',1,'2026-10-17 07:38:54',NULL,NULL),(6,1,1,'TEST-PO-001','2026-10-17',NULL,'30 days',17700.00,'','Pending',3,'2026-10-17 12:09:52',NULL,NULL),(7,1,1,'TEST-PO-002','2026-10-17',NULL,'30 days',4720.00,'','Pending',3,'2026-10-17 12:12:29',NULL,NULL);
/*!40000 ALTER TABLE `customer_pos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gst_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `shipping_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_balance` decimal(15,2) DEFAULT '0.00',
  `balance_type` enum('debit','credit') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'debit',
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `credit_limit` decimal(15,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `bank_account` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `ifsc_code` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contact_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `whatsapp` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `product_capabilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `debit_note_items`
--

DROP TABLE IF EXISTS `debit_note_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debit_note_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dn_id` int NOT NULL,
  `material_id` int NOT NULL,
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `quantity` decimal(10,3) DEFAULT '0.000',
  `rate` decimal(10,2) DEFAULT '0.00',
  `taxable_value` decimal(12,2) DEFAULT '0.00',
  `cgst_rate` decimal(5,2) DEFAULT '0.00',
  `cgst_amount` decimal(12,2) DEFAULT '0.00',
  `sgst_rate` decimal(5,2) DEFAULT '0.00',
  `sgst_amount` decimal(12,2) DEFAULT '0.00',
  `igst_rate` decimal(5,2) DEFAULT '0.00',
  `igst_amount` decimal(12,2) DEFAULT '0.00',
  `total_value` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `dn_id` (`dn_id`),
  CONSTRAINT `debit_note_items_ibfk_1` FOREIGN KEY (`dn_id`) REFERENCES `debit_notes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `debit_note_items`
--

LOCK TABLES `debit_note_items` WRITE;
/*!40000 ALTER TABLE `debit_note_items` DISABLE KEYS */;
INSERT INTO `debit_note_items` VALUES (1,1,1,'39159042',1.000,5000.00,5000.00,9.00,450.00,9.00,450.00,0.00,0.00,5900.00);
/*!40000 ALTER TABLE `debit_note_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `debit_notes`
--

DROP TABLE IF EXISTS `debit_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debit_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `dn_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dn_date` date NOT NULL,
  `supplier_id` int NOT NULL,
  `purchase_id` int NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `status` enum('Pending','Applied','Partial') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `applied_amount` decimal(15,2) DEFAULT '0.00',
  `vendor_dn_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linked_cn_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dn_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'quality',
  PRIMARY KEY (`id`),
  UNIQUE KEY `dn_number` (`dn_number`),
  KEY `branch_id` (`branch_id`),
  KEY `supplier_id` (`supplier_id`),
  KEY `purchase_id` (`purchase_id`),
  CONSTRAINT `debit_notes_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `debit_notes_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  CONSTRAINT `debit_notes_ibfk_3` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `debit_notes`
--

LOCK TABLES `debit_notes` WRITE;
/*!40000 ALTER TABLE `debit_notes` DISABLE KEYS */;
INSERT INTO `debit_notes` VALUES (1,1,'MVR/DN/001/26-27','2026-10-12',2,2,'',5900.00,'Applied',5900.00,NULL,NULL,1,'2026-10-12 16:49:26','quality');
/*!40000 ALTER TABLE `debit_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery_challans`
--

DROP TABLE IF EXISTS `delivery_challans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery_challans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `challan_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `challan_date` date NOT NULL,
  `invoice_id` int DEFAULT NULL,
  `customer_id` int NOT NULL,
  `vehicle_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_contact` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `transporter_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_quantity` decimal(15,3) DEFAULT '0.000',
  `total_value` decimal(15,2) DEFAULT '0.00',
  `status` enum('Draft','Dispatched','Delivered') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Draft',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `challan_number` (`challan_number`),
  KEY `branch_id` (`branch_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `delivery_challans_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `delivery_challans_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery_challans`
--

LOCK TABLES `delivery_challans` WRITE;
/*!40000 ALTER TABLE `delivery_challans` DISABLE KEYS */;
/*!40000 ALTER TABLE `delivery_challans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doc_series`
--

DROP TABLE IF EXISTS `doc_series`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doc_series` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `doc_type` enum('INV','PO','PUR','CN','DN','DC','REC','GRN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `prefix` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `financial_year` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_number` int DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_series` (`branch_id`,`doc_type`,`financial_year`),
  CONSTRAINT `doc_series_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doc_series`
--

LOCK TABLES `doc_series` WRITE;
/*!40000 ALTER TABLE `doc_series` DISABLE KEYS */;
INSERT INTO `doc_series` VALUES (1,1,'INV','MVR/INV','26-27',4),(2,1,'PO','MVR/PO','26-27',15),(3,1,'CN','MVR/CN','26-27',1),(4,1,'DN','MVR/DN','26-27',1),(5,1,'DC','MVR/DC','26-27',0),(6,1,'REC','MVR/REC','26-27',5),(7,1,'PUR','PUR','26-27',3),(8,1,'GRN','GRN','26-27',0);
/*!40000 ALTER TABLE `doc_series` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `designation` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `daily_wage` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `weekly_wage` decimal(10,2) DEFAULT '0.00',
  `monthly_wage` decimal(10,2) DEFAULT '0.00',
  `wage_type` enum('daily','weekly','monthly') COLLATE utf8mb4_unicode_ci DEFAULT 'daily',
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `expense_date` date NOT NULL,
  `category` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `amount` decimal(15,2) NOT NULL,
  `payment_mode` enum('Cash','Bank Transfer','UPI','Cheque') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `bank_account_id` int DEFAULT NULL,
  `receipt_file` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grn_items`
--

DROP TABLE IF EXISTS `grn_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grn_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grn_id` int NOT NULL,
  `material_id` int NOT NULL,
  `po_qty` decimal(10,3) DEFAULT '0.000',
  `received_qty` decimal(10,3) DEFAULT '0.000',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_grn` (`grn_id`),
  CONSTRAINT `grn_items_ibfk_1` FOREIGN KEY (`grn_id`) REFERENCES `grn_records` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grn_items`
--

LOCK TABLES `grn_items` WRITE;
/*!40000 ALTER TABLE `grn_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `grn_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grn_records`
--

DROP TABLE IF EXISTS `grn_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grn_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `purchase_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `received_date` date NOT NULL,
  `vehicle_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `received_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `remarks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Received',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_purchase` (`purchase_id`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `grn_records_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grn_records`
--

LOCK TABLES `grn_records` WRITE;
/*!40000 ALTER TABLE `grn_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `grn_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `indent_items`
--

DROP TABLE IF EXISTS `indent_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indent_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `indent_id` int NOT NULL,
  `material_id` int NOT NULL,
  `hsn_code` varchar(20) DEFAULT '',
  `quantity` decimal(10,3) DEFAULT '0.000',
  `unit` varchar(20) DEFAULT 'Kg',
  `rate` decimal(10,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `indent_id` (`indent_id`),
  CONSTRAINT `indent_items_ibfk_1` FOREIGN KEY (`indent_id`) REFERENCES `indents` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `indent_items`
--

LOCK TABLES `indent_items` WRITE;
/*!40000 ALTER TABLE `indent_items` DISABLE KEYS */;
INSERT INTO `indent_items` VALUES (1,1,7,'39159042',17060.000,'Kg',53.00),(2,1,8,'39159042',900.000,'Kg',43.00),(3,3,1,'39159042',2000.000,'Kg',53.00),(4,4,1,'39159042',18000.000,'Kg',53.00),(5,5,1,'39159042',18000.000,'Kg',63.00);
/*!40000 ALTER TABLE `indent_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `indents`
--

DROP TABLE IF EXISTS `indents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `indents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `indent_number` varchar(50) NOT NULL,
  `customer_id` int NOT NULL,
  `customer_po_id` int DEFAULT NULL,
  `customer_po_number` varchar(100) DEFAULT '',
  `indent_date` date NOT NULL,
  `required_date` date DEFAULT NULL,
  `notes` text,
  `status` enum('Open','In Progress','Invoiced','Closed') DEFAULT 'Open',
  `invoice_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_branch` (`branch_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `indents`
--

LOCK TABLES `indents` WRITE;
/*!40000 ALTER TABLE `indents` DISABLE KEYS */;
INSERT INTO `indents` VALUES (1,2,'IND/001/26-27',3,1,'Email DT :5/8/26','2026-08-08','2026-08-08','','Open',NULL,1,'2026-08-31 16:46:46'),(2,1,'IND/001/26-27',1,NULL,'','2026-08-31',NULL,'','Closed',NULL,1,'2026-08-31 16:54:10'),(3,1,'IND/002/26-27',1,2,'12345','2026-09-01','2026-09-10','','Closed',NULL,1,'2026-09-01 14:36:04'),(4,1,'IND/003/26-27',1,3,'Email Dated 5/08/26','2026-08-05','2026-08-15','','Closed',NULL,1,'2026-09-19 14:20:40'),(5,1,'IND/004/26-27',1,4,'PO 1234','2026-10-17','2026-10-24','','Closed',NULL,1,'2026-10-17 07:39:37');
/*!40000 ALTER TABLE `indents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice_items`
--

DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `material_id` int NOT NULL,
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `taxable_value` decimal(15,2) NOT NULL,
  `cgst_rate` decimal(5,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_rate` decimal(5,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_rate` decimal(5,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_value` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_id` (`invoice_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice_items`
--

LOCK TABLES `invoice_items` WRITE;
/*!40000 ALTER TABLE `invoice_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoice_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `invoice_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoice_date` date NOT NULL,
  `customer_id` int NOT NULL,
  `bill_to_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `ship_to_address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `po_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `po_date` date DEFAULT NULL,
  `vehicle_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `incoterms` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'FOB Road',
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `amount_in_words` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `amount_paid` decimal(15,2) DEFAULT '0.00',
  `balance_due` decimal(15,2) DEFAULT '0.00',
  `payment_status` enum('Unpaid','Partial','Paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Unpaid',
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `due_date` date DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `whatsapp_sent` tinyint(1) DEFAULT '0',
  `payment_link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cust_po_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `cust_po_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `branch_id` (`branch_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `unit` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Kg',
  `purchase_rate` decimal(10,2) DEFAULT '0.00',
  `sale_rate` decimal(10,2) DEFAULT '0.00',
  `gst_rate` decimal(5,2) DEFAULT '18.00',
  `current_stock` decimal(15,3) DEFAULT '0.000',
  `min_stock` decimal(15,3) DEFAULT '0.000',
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `materials_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materials`
--

LOCK TABLES `materials` WRITE;
/*!40000 ALTER TABLE `materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reference_id` int DEFAULT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `payment_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `party_type` enum('customer','supplier') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `party_id` int NOT NULL,
  `payment_mode` enum('Cash','Bank Transfer','UPI','Cheque','RTGS','NEFT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Bank Transfer',
  `amount` decimal(15,2) NOT NULL,
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bank_account_id` int DEFAULT NULL,
  `invoice_id` int DEFAULT NULL,
  `purchase_id` int DEFAULT NULL,
  `razorpay_order_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `razorpay_payment_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payment_number` (`payment_number`),
  KEY `branch_id` (`branch_id`),
  KEY `idx_purchase_id` (`purchase_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,'MVR/REC/001/26-27','2026-08-20','customer',1,'Bank Transfer',1086079.41,'',NULL,1,NULL,NULL,NULL,NULL,1,'2026-09-19 14:49:08'),(2,1,'MVR/REC/002/26-27','2026-08-05','supplier',1,'Bank Transfer',862080.00,'',NULL,NULL,1,NULL,NULL,'',1,'2026-09-19 14:49:50'),(3,1,'MVR/REC/003/26-27','2026-10-20','supplier',2,'UPI',142780.00,'12334455',NULL,NULL,2,NULL,NULL,'',1,'2026-10-12 16:50:04'),(4,1,'MVR/REC/004/26-27','2026-10-17','customer',1,'Bank Transfer',1338120.00,'SBI 1234',NULL,2,NULL,NULL,NULL,NULL,1,'2026-10-17 07:48:35'),(5,1,'MVR/REC/005/26-27','2026-10-17','supplier',2,'Bank Transfer',1231920.00,'UTB 1234',NULL,NULL,3,NULL,NULL,'',1,'2026-10-17 07:49:10');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `production_entries`
--

DROP TABLE IF EXISTS `production_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `production_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `production_date` date NOT NULL,
  `shift` enum('Morning','Evening','Night') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Morning',
  `input_material_id` int DEFAULT NULL,
  `input_quantity` decimal(15,3) DEFAULT NULL,
  `output_material_id` int DEFAULT NULL,
  `output_quantity` decimal(15,3) DEFAULT NULL,
  `wastage_quantity` decimal(15,3) DEFAULT '0.000',
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `input_material_id` (`input_material_id`),
  KEY `output_material_id` (`output_material_id`),
  CONSTRAINT `production_entries_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `production_entries_ibfk_2` FOREIGN KEY (`input_material_id`) REFERENCES `materials` (`id`),
  CONSTRAINT `production_entries_ibfk_3` FOREIGN KEY (`output_material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `production_entries`
--

LOCK TABLES `production_entries` WRITE;
/*!40000 ALTER TABLE `production_entries` DISABLE KEYS */;
/*!40000 ALTER TABLE `production_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_items`
--

DROP TABLE IF EXISTS `purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `purchase_id` int NOT NULL,
  `material_id` int NOT NULL,
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `taxable_value` decimal(15,2) NOT NULL,
  `cgst_rate` decimal(5,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_rate` decimal(5,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_rate` decimal(5,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_value` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `purchase_id` (`purchase_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_items`
--

LOCK TABLES `purchase_items` WRITE;
/*!40000 ALTER TABLE `purchase_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_order_items`
--

DROP TABLE IF EXISTS `purchase_order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `po_id` int NOT NULL,
  `material_id` int NOT NULL,
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hsn_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `rate` decimal(10,2) NOT NULL,
  `taxable_value` decimal(15,2) NOT NULL,
  `cgst_rate` decimal(5,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_rate` decimal(5,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_rate` decimal(5,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_value` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `po_id` (`po_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `purchase_order_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_order_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_order_items`
--

LOCK TABLES `purchase_order_items` WRITE;
/*!40000 ALTER TABLE `purchase_order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_orders`
--

DROP TABLE IF EXISTS `purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `po_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `po_date` date NOT NULL,
  `supplier_id` int NOT NULL,
  `supplier_type` enum('GST','Non-GST') COLLATE utf8mb4_unicode_ci DEFAULT 'GST',
  `is_auto_generated` tinyint(1) DEFAULT '0',
  `linked_purchase_id` int DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `incoterms` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `terms_conditions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Pending','Received','Cancelled','Partial','Draft') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `supplier_address` text COLLATE utf8mb4_unicode_ci,
  `delivery_address` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `branch_id` (`branch_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_orders`
--

LOCK TABLES `purchase_orders` WRITE;
/*!40000 ALTER TABLE `purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `purchase_number` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_date` date NOT NULL,
  `supplier_id` int NOT NULL,
  `po_id` int DEFAULT NULL,
  `vehicle_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `driver_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `cgst_amount` decimal(15,2) DEFAULT '0.00',
  `sgst_amount` decimal(15,2) DEFAULT '0.00',
  `igst_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) DEFAULT '0.00',
  `amount_paid` decimal(15,2) DEFAULT '0.00',
  `balance_due` decimal(15,2) DEFAULT '0.00',
  `payment_status` enum('Unpaid','Partial','Paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Unpaid',
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `due_date` date DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `purchase_number` (`purchase_number`),
  KEY `branch_id` (`branch_id`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `purchases_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `purchases_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_setting` (`branch_id`,`setting_key`),
  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,1,'company_name','MVR Polyplast'),(2,1,'company_address','D No:17-46-4/1, Kongapalem, Pedagantyada, Visakhapatnam, Andhra Pradesh - 530044'),(3,1,'company_gst','37ACDFM0167F1ZE'),(4,1,'company_msme','UDYAM-AP-10-0103793'),(5,1,'company_phone','6305064899'),(6,1,'company_email','info@mvrpolyplast.com'),(7,1,'app_name','ScrapCRM'),(8,1,'invoice_prefix','MVR/INV'),(9,1,'po_prefix','MVR/PO'),(10,1,'cn_prefix','MVR/CN'),(11,1,'dn_prefix','MVR/DN'),(12,1,'dc_prefix','MVR/DC'),(13,1,'financial_year','26-27'),(14,1,'smtp_host',''),(15,1,'smtp_port','587'),(16,1,'smtp_user',''),(17,1,'smtp_pass',''),(18,1,'razorpay_key',''),(19,1,'razorpay_secret','Admin@123'),(20,1,'supplier_alert_days','7'),(21,1,'waba_enabled','false'),(22,1,'waba_phone_id','admin@mvrpolyplast.com'),(23,1,'waba_token',''),(24,1,'app_url','http://localhost:3000'),(75,1,'sign_image','data:image/png;base64,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');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `material_id` int NOT NULL,
  `movement_type` enum('Purchase','Sale','Production In','Production Out','Adjustment','Return') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_type` enum('purchase','invoice','production','adjustment','challan') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` int NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `rate` decimal(10,2) DEFAULT '0.00',
  `value` decimal(15,2) DEFAULT '0.00',
  `balance_after` decimal(15,3) NOT NULL,
  `movement_date` date NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_advances`
--

DROP TABLE IF EXISTS `supplier_advances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_advances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `adjusted_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_mode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `reference_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `advance_date` date NOT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('Pending','Partial','Adjusted') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `purchase_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier` (`supplier_id`),
  KEY `idx_branch` (`branch_id`),
  CONSTRAINT `supplier_advances_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_advances`
--

LOCK TABLES `supplier_advances` WRITE;
/*!40000 ALTER TABLE `supplier_advances` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplier_advances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier_type` enum('Scrap Shop','Baler','Bales & Chips','Trader','Other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Other',
  `gst_registered` tinyint(1) DEFAULT '0',
  `gst_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pan_number` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_address` text COLLATE utf8mb4_unicode_ci,
  `shipping_address` text COLLATE utf8mb4_unicode_ci,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pincode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opening_balance` decimal(15,2) DEFAULT '0.00',
  `balance_type` enum('debit','credit') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'credit',
  `payment_terms` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `bank_account` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `ifsc_code` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `bank_branch` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contact_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `whatsapp` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '',
  `product_capabilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `account_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `account_holder_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `suppliers_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('superadmin','admin','manager','staff') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'staff',
  `branch_id` int DEFAULT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrator','admin@mvrpolyplast.com','$2a$10$RrvhfdOUKTNFjSH4YloJce3cva2B6bW3lDSqsK.pnlyyw24d9dnXa','superadmin',1,NULL,1,'2026-10-19 01:24:18','2026-07-25 13:31:19');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_customer_outstanding`
--

DROP TABLE IF EXISTS `v_customer_outstanding`;
/*!50001 DROP VIEW IF EXISTS `v_customer_outstanding`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_customer_outstanding` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `branch_id`,
 1 AS `total_outstanding`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_stock_status`
--

DROP TABLE IF EXISTS `v_stock_status`;
/*!50001 DROP VIEW IF EXISTS `v_stock_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_stock_status` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `hsn_code`,
 1 AS `unit`,
 1 AS `current_stock`,
 1 AS `min_stock`,
 1 AS `status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_last_receipt`
--

DROP TABLE IF EXISTS `v_supplier_last_receipt`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_last_receipt`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_last_receipt` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `supplier_type`,
 1 AS `branch_id`,
 1 AS `last_receipt_date`,
 1 AS `days_since_receipt`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `v_customer_outstanding`
--

/*!50001 DROP VIEW IF EXISTS `v_customer_outstanding`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_customer_outstanding` AS select `c`.`id` AS `id`,`c`.`name` AS `name`,`c`.`branch_id` AS `branch_id`,coalesce(sum(`i`.`balance_due`),0) AS `total_outstanding` from (`customers` `c` left join `invoices` `i` on(((`i`.`customer_id` = `c`.`id`) and (`i`.`payment_status` <> 'Paid')))) where (`c`.`is_active` = 1) group by `c`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_stock_status`
--

/*!50001 DROP VIEW IF EXISTS `v_stock_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_stock_status` AS select `materials`.`id` AS `id`,`materials`.`name` AS `name`,`materials`.`hsn_code` AS `hsn_code`,`materials`.`unit` AS `unit`,`materials`.`current_stock` AS `current_stock`,`materials`.`min_stock` AS `min_stock`,(case when (`materials`.`current_stock` <= 0) then 'Critical' when (`materials`.`current_stock` <= `materials`.`min_stock`) then 'Low' else 'Good' end) AS `status` from `materials` where (`materials`.`is_active` = 1) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_last_receipt`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_last_receipt`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_last_receipt` AS select `s`.`id` AS `id`,`s`.`name` AS `name`,`s`.`supplier_type` AS `supplier_type`,`s`.`branch_id` AS `branch_id`,max(`p`.`purchase_date`) AS `last_receipt_date`,(to_days(curdate()) - to_days(max(`p`.`purchase_date`))) AS `days_since_receipt` from (`suppliers` `s` left join `purchases` `p` on((`p`.`supplier_id` = `s`.`id`))) where (`s`.`is_active` = 1) group by `s`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-19  7:01:19
