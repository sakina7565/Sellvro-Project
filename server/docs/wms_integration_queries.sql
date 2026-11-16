-- ==============================================================================
-- SELLVRO MARKETPLACE & WMS MYSQL UNIFIED DATABASE INTEGRATION REFERENCE
-- Single Source of Truth for Suppliers, Products, Inventories & Fulfillments
-- ==============================================================================
-- NOTE: No table structure alteration (ALTER TABLE) is required.
-- All queries operate directly on the native WMS Laravel MySQL schema.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPPLIER REGISTRATION & ROLE ASSIGNMENT
-- Run when a supplier registers on Sellvro Marketplace.
-- ------------------------------------------------------------------------------
INSERT INTO users (name, user_unique_name, email, password, status, created_at, updated_at)
VALUES (
  'Supplier Full Name',
  'WMS-PAK1006',                -- Auto-incremented sequential client code
  'supplier@example.com',
  '$2a$12$e0MYzXyjpJS7pd0RVv...', -- Bcrypt hash (100% compatible with Laravel)
  'pending',                     -- Pending approval
  NOW(),
  NOW()
);

-- Assign Role ID 2 (Supplier) in Laravel Spatie permission table
INSERT INTO model_has_roles (role_id, model_type, model_id)
VALUES (2, 'App\\Models\\User', LAST_INSERT_ID());

-- ------------------------------------------------------------------------------
-- 2. SUPPLIER BUSINESS DETAILS & VERIFICATION
-- Run when supplier submits business profile.
-- ------------------------------------------------------------------------------
INSERT INTO supplier_business_details (
  user_id, business_name, business_description, category_id, phone,
  business_email, address, country, city, order_type, approx_number,
  monthly_order, payment_method, account_number, is_verified, created_at, updated_at
) VALUES (
  LAST_INSERT_ID(),
  'Global Trading Hub',
  'Wholesale Supplier of Consumer Electronics',
  '1',
  '+1 555-0199',
  'contact@globaltrading.com',
  '123 Commercial Ave',
  'United States',
  'New York',
  'B2B Wholesale',
  '100',
  '50',
  'Bank Transfer',
  'US89370400440532013000',
  0,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  business_name = VALUES(business_name),
  phone = VALUES(phone),
  address = VALUES(address),
  city = VALUES(city),
  country = VALUES(country),
  updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 3. UNIFIED PRODUCT & GLOBAL SKU CREATION
-- Run when a product is listed on Marketplace.
-- ------------------------------------------------------------------------------
INSERT INTO products (
  supplier_id, category_id, name, sku, image, description,
  weight, weight_unit, length, width, height, dimension_unit, brand,
  in_warehouse, status, fullfill_by, created_at, updated_at
) VALUES (
  1,                           -- Supplier WMS users.id
  1,                           -- Category ID
  'Wireless Noise Cancelling Headphones',
  'SVRO-00018',                -- Global unique sequential SKU
  'https://images.unsplash.com/...',
  'Premium high fidelity over-ear headphones.',
  350, 'g', 20, 18, 8, 'cm', 'Sony',
  1,                           -- 1 if warehouse inventory, 0 if self
  'approved',                  -- Status
  'wms',                       -- 'wms' or 'client'
  NOW(),
  NOW()
);

-- ------------------------------------------------------------------------------
-- 4. LIVE INVENTORY STOCK INITIALIZATION & DEDUCTION
-- ------------------------------------------------------------------------------
-- When product is first stored in warehouse:
INSERT INTO inventories (
  client_id, product_id, location_id, sku, product_title, current_quantity, status, created_at, updated_at
) VALUES (
  1, LAST_INSERT_ID(), 1, 'SVRO-00018', 'Wireless Noise Cancelling Headphones', 50, 'active', NOW(), NOW()
);

-- When an order is placed on Marketplace (atomic real-time stock deduction):
UPDATE inventories
SET current_quantity = GREATEST(0, current_quantity - 1), updated_at = NOW()
WHERE sku = 'SVRO-00018';

-- ------------------------------------------------------------------------------
-- 5. WMS DISPATCH QUEUE & TRACKING (USPS / UPS / FEDEX)
-- Run when order is queued for warehouse dispatch or marked shipped.
-- ------------------------------------------------------------------------------
INSERT INTO fulfillment_requests (
  request_number, client_id, location_id, sku, quantity,
  carrier, tracking_number, label_pdf, customizations, source, status, created_at, updated_at
) VALUES (
  'REQ-2026110301',
  1,
  1,
  'SVRO-00018',
  1,
  'USPS',                      -- 'USPS', 'UPS', or 'FedEx'
  '9400111899562537624112',    -- Real courier tracking number
  'https://sellvro.com/labels/LBL-94001.pdf',
  'Handle with care',
  'client',
  'pending',
  NOW(),
  NOW()
);

-- When warehouse dispatches the parcel:
UPDATE fulfillment_requests
SET status = 'dispatched', updated_at = NOW()
WHERE request_number = 'REQ-2026110301';

-- ==============================================================================
-- END OF REFERENCE QUERIES
-- ==============================================================================

