const VIETNAM_PROVINCE_LIST_2025 = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Cần Thơ',
  'Đà Nẵng',
  'Điện Biên',
  'Đắk Lắk',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Phòng',
  'Hưng Yên',
  'Huế',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thanh Hóa',
  'Thái Nguyên',
  'Tuyên Quang',
  'TP.HCM',
  'Vĩnh Long',
] as const;

const BIRTH_PLACE_ALIAS_ENTRIES = [
  ['an giang', 'An Giang'],
  ['kien giang', 'An Giang'],
  ['bac ninh', 'Bắc Ninh'],
  ['bac giang', 'Bắc Ninh'],
  ['ca mau', 'Cà Mau'],
  ['bac lieu', 'Cà Mau'],
  ['cao bang', 'Cao Bằng'],
  ['can tho', 'Cần Thơ'],
  ['soc trang', 'Cần Thơ'],
  ['hau giang', 'Cần Thơ'],
  ['da nang', 'Đà Nẵng'],
  ['quang nam', 'Đà Nẵng'],
  ['dien bien', 'Điện Biên'],
  ['dak lak', 'Đắk Lắk'],
  ['daklak', 'Đắk Lắk'],
  ['phu yen', 'Đắk Lắk'],
  ['dong nai', 'Đồng Nai'],
  ['binh phuoc', 'Đồng Nai'],
  ['dong thap', 'Đồng Tháp'],
  ['tien giang', 'Đồng Tháp'],
  ['gia lai', 'Gia Lai'],
  ['binh dinh', 'Gia Lai'],
  ['ha noi', 'Hà Nội'],
  ['ha tinh', 'Hà Tĩnh'],
  ['hai phong', 'Hải Phòng'],
  ['hai duong', 'Hải Phòng'],
  ['hung yen', 'Hưng Yên'],
  ['thai binh', 'Hưng Yên'],
  ['hue', 'Huế'],
  ['thua thien hue', 'Huế'],
  ['thua thien - hue', 'Huế'],
  ['khanh hoa', 'Khánh Hòa'],
  ['ninh thuan', 'Khánh Hòa'],
  ['lai chau', 'Lai Châu'],
  ['lam dong', 'Lâm Đồng'],
  ['binh thuan', 'Lâm Đồng'],
  ['dak nong', 'Lâm Đồng'],
  ['daknong', 'Lâm Đồng'],
  ['lang son', 'Lạng Sơn'],
  ['lao cai', 'Lào Cai'],
  ['yen bai', 'Lào Cai'],
  ['nghe an', 'Nghệ An'],
  ['ninh binh', 'Ninh Bình'],
  ['ha nam', 'Ninh Bình'],
  ['nam dinh', 'Ninh Bình'],
  ['phu tho', 'Phú Thọ'],
  ['vinh phuc', 'Phú Thọ'],
  ['hoa binh', 'Phú Thọ'],
  ['quang ngai', 'Quảng Ngãi'],
  ['kon tum', 'Quảng Ngãi'],
  ['quang ninh', 'Quảng Ninh'],
  ['quang tri', 'Quảng Trị'],
  ['quang binh', 'Quảng Trị'],
  ['son la', 'Sơn La'],
  ['tay ninh', 'Tây Ninh'],
  ['long an', 'Tây Ninh'],
  ['thanh hoa', 'Thanh Hóa'],
  ['thai nguyen', 'Thái Nguyên'],
  ['bac kan', 'Thái Nguyên'],
  ['bac can', 'Thái Nguyên'],
  ['tuyen quang', 'Tuyên Quang'],
  ['ha giang', 'Tuyên Quang'],
  ['tp hcm', 'TP.HCM'],
  ['tphcm', 'TP.HCM'],
  ['ho chi minh', 'TP.HCM'],
  ['ho chi minh city', 'TP.HCM'],
  ['thanh pho ho chi minh', 'TP.HCM'],
  ['ba ria vung tau', 'TP.HCM'],
  ['ba ria - vung tau', 'TP.HCM'],
  ['binh duong', 'TP.HCM'],
  ['vinh long', 'Vĩnh Long'],
  ['ben tre', 'Vĩnh Long'],
  ['tra vinh', 'Vĩnh Long'],
] as const;

const BIRTH_PLACE_ALIAS_MAP = new Map(
  BIRTH_PLACE_ALIAS_ENTRIES.map(([alias, canonical]) => [alias, canonical])
);

export const VIETNAM_PROVINCE_OPTIONS_2025 = VIETNAM_PROVINCE_LIST_2025.map((name) => ({
  label: name,
  value: name,
}));

export function normalizeBirthPlaceKey(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeBirthPlaceValue(value: string) {
  const trimmed = String(value || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';

  const aliasMatch = BIRTH_PLACE_ALIAS_MAP.get(normalizeBirthPlaceKey(trimmed));
  return aliasMatch || trimmed;
}

export function isVietnamProvince2025(value: string) {
  const normalized = normalizeBirthPlaceValue(value);
  return VIETNAM_PROVINCE_LIST_2025.includes(normalized as (typeof VIETNAM_PROVINCE_LIST_2025)[number]);
}

export { VIETNAM_PROVINCE_LIST_2025 };
