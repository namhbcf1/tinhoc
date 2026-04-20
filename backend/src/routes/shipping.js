import { Hono } from 'hono';
import { errorResponse, jsonResponse } from '../utils/helpers.js';
import { getCertificateById } from '../db/certificate-queries.js';
import { isVietnamesePhoneNumber, resolveAddressAgainstCatalog } from '../services/viettel-post-address.js';
import { getViettelPostErrorMessage, listViettelPostDistricts, listViettelPostProvinces, listViettelPostWards, quoteViettelPostShipment, } from '../services/viettel-post.js';
const shipping = new Hono();
function parsePositiveInteger(value) {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function getErrorStatus(error, fallback = 502) {
    const status = Number(error?.status);
    return Number.isFinite(status) && status > 0 ? status : fallback;
}
shipping.get('/viettel-post/provinces', async (c) => {
    try {
        const provinces = await listViettelPostProvinces(c.env);
        return jsonResponse({
            success: true,
            data: provinces,
            count: provinces.length,
        });
    }
    catch (error) {
        return errorResponse(getViettelPostErrorMessage(error), getErrorStatus(error));
    }
});
shipping.get('/viettel-post/districts', async (c) => {
    const provinceId = parsePositiveInteger(c.req.query('province_id'));
    if (!provinceId) {
        return errorResponse('Thiếu province_id hợp lệ.', 400);
    }
    try {
        const districts = await listViettelPostDistricts(c.env, provinceId);
        return jsonResponse({
            success: true,
            data: districts,
            count: districts.length,
        });
    }
    catch (error) {
        return errorResponse(getViettelPostErrorMessage(error), getErrorStatus(error));
    }
});
shipping.get('/viettel-post/wards', async (c) => {
    const districtId = parsePositiveInteger(c.req.query('district_id'));
    if (!districtId) {
        return errorResponse('Thiếu district_id hợp lệ.', 400);
    }
    try {
        const wards = await listViettelPostWards(c.env, districtId);
        return jsonResponse({
            success: true,
            data: wards,
            count: wards.length,
        });
    }
    catch (error) {
        return errorResponse(getViettelPostErrorMessage(error), getErrorStatus(error));
    }
});
shipping.post('/viettel-post/normalize-address', async (c) => {
    try {
        const body = await c.req.json();
        const receiverName = String(body?.receiver_name || '').trim();
        const receiverPhone = String(body?.receiver_phone || '').trim();
        const rawAddress = String(body?.raw_address || '').trim();
        const certificateId = parsePositiveInteger(body?.certificate_id ? String(body.certificate_id) : undefined);
        if (!receiverName) {
            return errorResponse('Thiếu receiver_name.', 400);
        }
        if (!receiverPhone || !isVietnamesePhoneNumber(receiverPhone)) {
            return errorResponse('Số điện thoại người nhận chưa hợp lệ.', 400);
        }
        if (!rawAddress) {
            return errorResponse('Thiếu raw_address.', 400);
        }
        if (certificateId) {
            const cert = await getCertificateById(c.env.DB, certificateId);
            if (!cert) {
                return errorResponse('Không tìm thấy chứng chỉ để chuẩn hóa địa chỉ.', 404);
            }
        }
        const provinces = await listViettelPostProvinces(c.env);
        const normalized = await resolveAddressAgainstCatalog(rawAddress, provinces, (provinceId) => listViettelPostDistricts(c.env, provinceId), (districtId) => listViettelPostWards(c.env, districtId));
        return jsonResponse({
            success: true,
            data: {
                receiver_name: receiverName,
                receiver_phone: receiverPhone,
                raw_address: rawAddress,
                ...normalized,
            },
        });
    }
    catch (error) {
        return errorResponse(getViettelPostErrorMessage(error), getErrorStatus(error));
    }
});
shipping.post('/viettel-post/quote', async (c) => {
    try {
        const body = await c.req.json();
        const certificateId = parsePositiveInteger(body?.certificate_id ? String(body.certificate_id) : undefined);
        const receiverPhone = String(body?.receiver_phone || '').trim();
        const addressLine = String(body?.address_line || '').trim();
        const provinceId = parsePositiveInteger(body?.province_id ? String(body.province_id) : undefined);
        const districtId = parsePositiveInteger(body?.district_id ? String(body.district_id) : undefined);
        const wardId = parsePositiveInteger(body?.ward_id ? String(body.ward_id) : undefined);
        const productWeight = parsePositiveInteger(body?.product_weight_grams ? String(body.product_weight_grams) : undefined) || 250;
        if (certificateId) {
            const cert = await getCertificateById(c.env.DB, certificateId);
            if (!cert) {
                return errorResponse('Không tìm thấy chứng chỉ cần báo giá.', 404);
            }
        }
        if (!receiverPhone || !isVietnamesePhoneNumber(receiverPhone)) {
            return errorResponse('Số điện thoại người nhận chưa hợp lệ.', 400);
        }
        if (!addressLine || !provinceId || !districtId || !wardId) {
            return errorResponse('Thiếu địa chỉ chuẩn hóa để báo giá.', 400);
        }
        const quote = await quoteViettelPostShipment(c.env, {
            receiver_province_id: provinceId,
            receiver_district_id: districtId,
            receiver_ward_id: wardId,
            product_weight_grams: productWeight,
        });
        return jsonResponse({
            success: true,
            data: quote,
        });
    }
    catch (error) {
        return errorResponse(getViettelPostErrorMessage(error), getErrorStatus(error));
    }
});
export default shipping;
