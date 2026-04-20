const OPEN_SHIPMENT_STATUSES = ['draft', 'quoted', 'created', 'in_transit'];
function serializeJson(value) {
    if (value === undefined || value === null) {
        return null;
    }
    return JSON.stringify(value);
}
export function getOpenShipmentStatuses() {
    return [...OPEN_SHIPMENT_STATUSES];
}
export async function getLatestShipmentByCertificate(db, certificateId) {
    return db.prepare(`
    SELECT
      cs.*,
      a.full_name AS created_by_name
    FROM certificate_shipments cs
    LEFT JOIN admins a ON cs.created_by = a.id
    WHERE cs.certificate_id = ?
    ORDER BY cs.created_at DESC, cs.id DESC
    LIMIT 1
  `).bind(certificateId).first();
}
export async function getOpenShipmentByCertificate(db, certificateId) {
    const placeholders = OPEN_SHIPMENT_STATUSES.map(() => '?').join(', ');
    return db.prepare(`
    SELECT
      cs.*,
      a.full_name AS created_by_name
    FROM certificate_shipments cs
    LEFT JOIN admins a ON cs.created_by = a.id
    WHERE cs.certificate_id = ?
      AND cs.status IN (${placeholders})
    ORDER BY cs.created_at DESC, cs.id DESC
    LIMIT 1
  `).bind(certificateId, ...OPEN_SHIPMENT_STATUSES).first();
}
export async function createCertificateShipment(db, data) {
    const result = await db.prepare(`
    INSERT INTO certificate_shipments (
      certificate_id,
      student_id,
      carrier,
      carrier_order_number,
      carrier_tracking_number,
      status,
      receiver_name,
      receiver_phone,
      address_raw,
      address_line,
      province_id,
      province_name,
      district_id,
      district_name,
      ward_id,
      ward_name,
      normalized_full_address,
      resolution_status,
      warnings_json,
      service_code,
      service_name,
      service_add_codes_json,
      product_name,
      product_description,
      product_weight_grams,
      declared_value,
      shipping_fee,
      raw_request_json,
      raw_response_json,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(data.certificate_id, data.student_id, data.carrier || 'viettel_post', data.carrier_order_number || null, data.carrier_tracking_number || null, data.status || 'draft', data.receiver_name, data.receiver_phone, data.address_raw, data.address_line || null, data.province_id ?? null, data.province_name || null, data.district_id ?? null, data.district_name || null, data.ward_id ?? null, data.ward_name || null, data.normalized_full_address || null, data.resolution_status || 'unresolved', serializeJson(data.warnings_json ?? data.warnings ?? []), data.service_code || null, data.service_name || null, serializeJson(data.service_add_codes_json ?? data.service_add_codes ?? []), data.product_name || 'Chứng chỉ', data.product_description || 'Chứng chỉ, tài liệu', data.product_weight_grams || 250, data.declared_value || 0, data.shipping_fee ?? null, serializeJson(data.raw_request_json), serializeJson(data.raw_response_json), data.created_by || null).run();
    return result;
}
export async function updateCertificateShipment(db, shipmentId, data) {
    const updates = [];
    const values = [];
    const assign = (column, value, asJson = false) => {
        if (value === undefined)
            return;
        updates.push(`${column} = ?`);
        values.push(asJson ? serializeJson(value) : value);
    };
    assign('carrier', data.carrier);
    assign('carrier_order_number', data.carrier_order_number);
    assign('carrier_tracking_number', data.carrier_tracking_number);
    assign('status', data.status);
    assign('receiver_name', data.receiver_name);
    assign('receiver_phone', data.receiver_phone);
    assign('address_raw', data.address_raw);
    assign('address_line', data.address_line);
    assign('province_id', data.province_id);
    assign('province_name', data.province_name);
    assign('district_id', data.district_id);
    assign('district_name', data.district_name);
    assign('ward_id', data.ward_id);
    assign('ward_name', data.ward_name);
    assign('normalized_full_address', data.normalized_full_address);
    assign('resolution_status', data.resolution_status);
    assign('warnings_json', data.warnings_json ?? data.warnings, true);
    assign('service_code', data.service_code);
    assign('service_name', data.service_name);
    assign('service_add_codes_json', data.service_add_codes_json ?? data.service_add_codes, true);
    assign('product_name', data.product_name);
    assign('product_description', data.product_description);
    assign('product_weight_grams', data.product_weight_grams);
    assign('declared_value', data.declared_value);
    assign('shipping_fee', data.shipping_fee);
    assign('raw_request_json', data.raw_request_json, true);
    assign('raw_response_json', data.raw_response_json, true);
    if (!updates.length) {
        return { success: true, meta: { changes: 0 } };
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(shipmentId);
    return db.prepare(`
    UPDATE certificate_shipments
    SET ${updates.join(', ')}
    WHERE id = ?
  `).bind(...values).run();
}
