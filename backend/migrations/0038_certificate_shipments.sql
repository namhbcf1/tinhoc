-- Migration: 0038_certificate_shipments
-- Description: Add Viettel Post shipment records for certificate delivery

CREATE TABLE IF NOT EXISTS certificate_shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  carrier TEXT NOT NULL DEFAULT 'viettel_post',
  carrier_order_number TEXT,
  carrier_tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'quoted', 'created', 'in_transit', 'delivered', 'cancelled_local', 'failed')),
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  address_raw TEXT NOT NULL,
  address_line TEXT,
  province_id INTEGER,
  province_name TEXT,
  district_id INTEGER,
  district_name TEXT,
  ward_id INTEGER,
  ward_name TEXT,
  normalized_full_address TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'unresolved'
    CHECK(resolution_status IN ('resolved', 'needs_review', 'unresolved')),
  warnings_json TEXT,
  service_code TEXT,
  service_name TEXT,
  service_add_codes_json TEXT,
  product_name TEXT NOT NULL DEFAULT 'Chứng chỉ',
  product_description TEXT NOT NULL DEFAULT 'Chứng chỉ, tài liệu',
  product_weight_grams INTEGER NOT NULL DEFAULT 250,
  declared_value INTEGER NOT NULL DEFAULT 0,
  shipping_fee INTEGER,
  raw_request_json TEXT,
  raw_response_json TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_certificate_shipments_certificate ON certificate_shipments(certificate_id);
CREATE INDEX IF NOT EXISTS idx_certificate_shipments_student ON certificate_shipments(student_id);
CREATE INDEX IF NOT EXISTS idx_certificate_shipments_status ON certificate_shipments(status);
