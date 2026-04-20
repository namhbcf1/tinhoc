import { describe, expect, it } from 'vitest';
import { resolveAddressAgainstCatalog } from '../../services/viettel-post-address.js';
const provinces = [
    {
        PROVINCE_ID: 63,
        PROVINCE_NAME: 'Tỉnh Cà Mau',
    },
];
const districtsByProvince = {
    63: [
        {
            DISTRICT_ID: 100000063,
            DISTRICT_NAME: 'Bỏ qua - Sử dụng địa chỉ 2 cấp',
            DISTRICT_VALUE: 'NEW',
            PROVINCE_ID: 63,
        },
    ],
};
const wardsByDistrict = {
    100000063: [
        {
            WARDS_ID: 49822,
            WARDS_NAME: 'Xã Châu Thới',
            DISTRICT_ID: 100000063,
        },
    ],
};
describe('viettel post address normalization', () => {
    it('resolves the sample Ca Mau two-level address', async () => {
        const result = await resolveAddressAgainstCatalog('Ấp Tam Hưng, Xã Châu Thới, Tỉnh Cà Mau', provinces, async (provinceId) => districtsByProvince[provinceId] || [], async (districtId) => wardsByDistrict[districtId] || []);
        expect(result.address_line).toBe('Ấp Tam Hưng');
        expect(result.province_id).toBe(63);
        expect(result.district_id).toBe(100000063);
        expect(result.ward_id).toBe(49822);
        expect(result.resolution_status).toBe('resolved');
        expect(result.normalized_full_address).toBe('Ấp Tam Hưng, Xã Châu Thới, Tỉnh Cà Mau');
    });
    it('marks address as needs_review when address line is missing', async () => {
        const result = await resolveAddressAgainstCatalog('Xã Châu Thới, Tỉnh Cà Mau', provinces, async (provinceId) => districtsByProvince[provinceId] || [], async (districtId) => wardsByDistrict[districtId] || []);
        expect(result.province_id).toBe(63);
        expect(result.ward_id).toBe(49822);
        expect(result.address_line).toBe('');
        expect(result.resolution_status).toBe('needs_review');
    });
});
