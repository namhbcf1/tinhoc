import { removeDiacritics } from '../utils/helpers.js';

export interface ViettelProvince {
  PROVINCE_ID: number;
  PROVINCE_NAME: string;
  PROVINCE_CODE?: string;
}

export interface ViettelDistrict {
  DISTRICT_ID: number;
  DISTRICT_NAME: string;
  DISTRICT_VALUE?: string;
  PROVINCE_ID: number;
}

export interface ViettelWard {
  WARDS_ID: number;
  WARDS_NAME: string;
  DISTRICT_ID: number;
}

export type ShipmentResolutionStatus = 'resolved' | 'needs_review' | 'unresolved';

export interface AddressResolutionResult {
  address_line: string;
  province_id: number | null;
  province_name: string | null;
  district_id: number | null;
  district_name: string | null;
  ward_id: number | null;
  ward_name: string | null;
  normalized_full_address: string;
  resolution_status: ShipmentResolutionStatus;
  warnings: string[];
}

interface TextPart {
  raw: string;
  normalized: string;
}

interface NamedMatch<T> {
  item: T;
  part: TextPart;
  score: number;
}

const PROVINCE_PREFIXES = [
  'tinh',
  'thanh pho',
  'tp',
  'tp.',
];

const DISTRICT_PREFIXES = [
  'quan',
  'huyen',
  'thi xa',
  'thanh pho',
  'tp',
  'tp.',
];

const WARD_PREFIXES = [
  'xa',
  'phuong',
  'thi tran',
  'tt',
  'tt.',
];

const WHITESPACE_RE = /\s+/g;
const PUNCT_RE = /[.,;:/\\\-]+/g;

function normalizeCompare(value: string): string {
  return removeDiacritics(String(value || ''))
    .toLowerCase()
    .replace(PUNCT_RE, ' ')
    .replace(WHITESPACE_RE, ' ')
    .trim();
}

function stripKnownPrefixes(value: string, prefixes: string[]): string {
  let current = normalizeCompare(value);
  let changed = true;

  while (changed) {
    changed = false;
    for (const prefix of prefixes) {
      if (current.startsWith(`${prefix} `)) {
        current = current.slice(prefix.length).trim();
        changed = true;
      }
    }
  }

  return current;
}

function splitRawAddress(rawAddress: string): TextPart[] {
  return String(rawAddress || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((raw) => ({
      raw,
      normalized: normalizeCompare(raw),
    }));
}

function buildNameVariants(name: string, kind: 'province' | 'district' | 'ward'): string[] {
  const normalizedName = normalizeCompare(name);
  const stripped =
    kind === 'province'
      ? stripKnownPrefixes(name, PROVINCE_PREFIXES)
      : kind === 'district'
        ? stripKnownPrefixes(name, DISTRICT_PREFIXES)
        : stripKnownPrefixes(name, WARD_PREFIXES);

  const variants = new Set<string>([normalizedName]);
  if (stripped) {
    variants.add(stripped);
  }

  if (kind === 'province') {
    variants.add(`tinh ${stripped}`);
    variants.add(`thanh pho ${stripped}`);
  } else if (kind === 'district') {
    variants.add(`quan ${stripped}`);
    variants.add(`huyen ${stripped}`);
    variants.add(`thi xa ${stripped}`);
    variants.add(`thanh pho ${stripped}`);
  } else {
    variants.add(`xa ${stripped}`);
    variants.add(`phuong ${stripped}`);
    variants.add(`thi tran ${stripped}`);
  }

  return [...variants].filter(Boolean);
}

function pickBestMatch<T>(
  parts: TextPart[],
  items: T[],
  getName: (item: T) => string,
  kind: 'province' | 'district' | 'ward',
): NamedMatch<T> | null {
  const matches: Array<NamedMatch<T>> = [];

  for (const part of parts) {
    for (const item of items) {
      const variants = buildNameVariants(getName(item), kind);
      const partNormalized = part.normalized;
      const partStripped =
        kind === 'province'
          ? stripKnownPrefixes(part.raw, PROVINCE_PREFIXES)
          : kind === 'district'
            ? stripKnownPrefixes(part.raw, DISTRICT_PREFIXES)
            : stripKnownPrefixes(part.raw, WARD_PREFIXES);

      let score = 0;
      if (variants.includes(partNormalized)) {
        score = 100;
      } else if (partStripped && variants.includes(partStripped)) {
        score = 95;
      } else if (variants.some((variant) => partNormalized.includes(variant) || variant.includes(partNormalized))) {
        score = 80;
      }

      if (score > 0) {
        matches.push({ item, part, score });
      }
    }
  }

  if (!matches.length) {
    return null;
  }

  matches.sort((left, right) => right.score - left.score);
  const [best] = matches;
  const tied = matches.filter(
    (entry) =>
      entry.score === best.score &&
      normalizeCompare(getName(entry.item)) === normalizeCompare(getName(best.item)),
  );

  if (tied.length > 1) {
    return best;
  }

  const equallyStrongDifferentItems = matches.filter((entry) => entry.score === best.score);
  if (equallyStrongDifferentItems.length > 1) {
    return null;
  }

  return best;
}

function isTwoLevelDistrict(district: ViettelDistrict | null | undefined): boolean {
  if (!district) return false;
  return String(district.DISTRICT_VALUE || '').toUpperCase() === 'NEW'
    || normalizeCompare(district.DISTRICT_NAME).includes('bo qua su dung dia chi 2 cap');
}

function dedupeDistrictIds(districts: ViettelDistrict[]): number[] {
  return [...new Set(districts.map((district) => district.DISTRICT_ID))];
}

function sanitizeAddressLine(parts: TextPart[]): string {
  return parts
    .map((part) => part.raw.replace(WHITESPACE_RE, ' ').trim())
    .filter(Boolean)
    .join(', ');
}

export async function resolveAddressAgainstCatalog(
  rawAddress: string,
  provinces: ViettelProvince[],
  getDistricts: (provinceId: number) => Promise<ViettelDistrict[]>,
  getWards: (districtId: number) => Promise<ViettelWard[]>,
): Promise<AddressResolutionResult> {
  const warnings: string[] = [];
  const parts = splitRawAddress(rawAddress);

  if (!parts.length) {
    return {
      address_line: '',
      province_id: null,
      province_name: null,
      district_id: null,
      district_name: null,
      ward_id: null,
      ward_name: null,
      normalized_full_address: '',
      resolution_status: 'unresolved',
      warnings: ['Địa chỉ trống hoặc không hợp lệ.'],
    };
  }

  const provinceMatch = pickBestMatch([...parts].reverse(), provinces, (item) => item.PROVINCE_NAME, 'province');
  if (!provinceMatch) {
    return {
      address_line: sanitizeAddressLine(parts),
      province_id: null,
      province_name: null,
      district_id: null,
      district_name: null,
      ward_id: null,
      ward_name: null,
      normalized_full_address: sanitizeAddressLine(parts),
      resolution_status: 'unresolved',
      warnings: ['Không xác định được tỉnh/thành theo danh mục Viettel Post.'],
    };
  }

  const province = provinceMatch.item;
  const remainingAfterProvince = parts.filter((part) => part.raw !== provinceMatch.part.raw);
  const districts = await getDistricts(province.PROVINCE_ID);
  const newDistrict = districts.find(isTwoLevelDistrict) || null;

  const explicitDistrictParts = remainingAfterProvince.filter((part) => {
    const normalized = part.normalized;
    return DISTRICT_PREFIXES.some((prefix) => normalized.startsWith(`${prefix} `));
  });
  const districtMatch = explicitDistrictParts.length
    ? pickBestMatch(explicitDistrictParts, districts, (item) => item.DISTRICT_NAME, 'district')
    : null;

  if (explicitDistrictParts.length && !districtMatch) {
    warnings.push('Không xác định được quận/huyện từ địa chỉ đã nhập.');
  }

  const wardCandidateParts = remainingAfterProvince.filter((part) => part.raw !== districtMatch?.part.raw);
  const searchDistricts: ViettelDistrict[] = [];
  if (districtMatch) {
    searchDistricts.push(districtMatch.item);
  }
  if (newDistrict && (!districtMatch || newDistrict.DISTRICT_ID !== districtMatch.item.DISTRICT_ID)) {
    searchDistricts.push(newDistrict);
  }

  let wardMatch: NamedMatch<ViettelWard> | null = null;
  let wardDistrict: ViettelDistrict | null = districtMatch?.item || null;

  if (searchDistricts.length) {
    const wardMatches: Array<{
      wardMatch: NamedMatch<ViettelWard>;
      district: ViettelDistrict;
    }> = [];

    for (const district of searchDistricts) {
      const wards = await getWards(district.DISTRICT_ID);
      const match = pickBestMatch(wardCandidateParts, wards, (item) => item.WARDS_NAME, 'ward');
      if (match) {
        wardMatches.push({ wardMatch: match, district });
      }
    }

    if (wardMatches.length === 1) {
      wardMatch = wardMatches[0].wardMatch;
      wardDistrict = wardMatches[0].district;
    } else if (wardMatches.length > 1) {
      const bestScore = Math.max(...wardMatches.map((entry) => entry.wardMatch.score));
      const bestMatches = wardMatches.filter((entry) => entry.wardMatch.score === bestScore);
      if (bestMatches.length === 1) {
        wardMatch = bestMatches[0].wardMatch;
        wardDistrict = bestMatches[0].district;
      } else {
        warnings.push('Địa chỉ xã/phường khớp nhiều địa bàn khác nhau, cần kiểm tra lại.');
      }
    }
  }

  if (!wardMatch) {
    warnings.push('Không xác định chắc chắn được xã/phường theo danh mục Viettel Post.');
  }

  if (isTwoLevelDistrict(wardDistrict)) {
    warnings.push('Địa chỉ được map theo mô hình hành chính 2 cấp mới của Viettel Post.');
  }

  const leftoverParts = parts.filter(
    (part) =>
      part.raw !== provinceMatch.part.raw
      && part.raw !== districtMatch?.part.raw
      && part.raw !== wardMatch?.part.raw,
  );
  const addressLine = sanitizeAddressLine(leftoverParts);

  let resolutionStatus: ShipmentResolutionStatus = 'resolved';
  if (!wardMatch || !addressLine) {
    resolutionStatus = province ? 'needs_review' : 'unresolved';
  }
  if (!province) {
    resolutionStatus = 'unresolved';
  }

  const normalizedFullAddress = [
    addressLine,
    wardMatch?.item.WARDS_NAME || null,
    wardDistrict && !isTwoLevelDistrict(wardDistrict) ? wardDistrict.DISTRICT_NAME : null,
    province.PROVINCE_NAME,
  ].filter(Boolean).join(', ');

  return {
    address_line: addressLine,
    province_id: province.PROVINCE_ID,
    province_name: province.PROVINCE_NAME,
    district_id: wardDistrict?.DISTRICT_ID ?? districtMatch?.item.DISTRICT_ID ?? null,
    district_name: wardDistrict?.DISTRICT_NAME ?? districtMatch?.item.DISTRICT_NAME ?? null,
    ward_id: wardMatch?.item.WARDS_ID ?? null,
    ward_name: wardMatch?.item.WARDS_NAME ?? null,
    normalized_full_address: normalizedFullAddress,
    resolution_status: resolutionStatus,
    warnings: [...new Set(warnings)],
  };
}

export function isVietnamesePhoneNumber(value: string): boolean {
  const digits = String(value || '').replace(/\D/g, '');
  return /^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(digits) || /^0\d{9,10}$/.test(digits);
}
