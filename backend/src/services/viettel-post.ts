import type { Env } from '../types/env.js';

const VIETTEL_POST_BASE_URL = 'https://partner.viettelpost.vn';

type Envelope<T> = {
  status?: number;
  error?: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
};

export interface ViettelExtraService {
  code: string;
  name: string;
}

export interface ViettelQuotedService {
  service_code: string;
  service_name: string;
  fee: number;
  eta_text: string | null;
  supported_add_codes: string[];
  supported_add_services: ViettelExtraService[];
}

export interface QuoteShipmentInput {
  receiver_province_id: number;
  receiver_district_id: number;
  receiver_ward_id?: number | null;
  product_weight_grams: number;
}

export interface CreateShipmentInput {
  order_number: string;
  receiver_name: string;
  receiver_phone: string;
  address_line: string;
  raw_address: string;
  province_id: number;
  district_id: number;
  ward_id: number;
  service_code: string;
  service_name?: string | null;
  service_add_codes: string[];
  product_weight_grams: number;
  product_name: string;
  product_description: string;
  declared_value: number;
}

class ViettelPostError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status = 500, details: unknown = null) {
    super(message);
    this.name = 'ViettelPostError';
    this.status = status;
    this.details = details;
  }
}

function parseInteger(value: unknown): number | null {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeTrim(value: unknown): string {
  return String(value ?? '').trim();
}

function pickString(value: unknown, fallback = ''): string {
  const next = safeTrim(value);
  return next || fallback;
}

function pickNumber(...candidates: unknown[]): number {
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function parseResponse<T>(response: Response): Promise<Envelope<T>> {
  const text = await response.text();
  if (!text) {
    throw new ViettelPostError('Viettel Post trả về phản hồi trống.', response.status);
  }

  try {
    return JSON.parse(text) as Envelope<T>;
  } catch (error) {
    throw new ViettelPostError('Không đọc được phản hồi JSON từ Viettel Post.', response.status, text);
  }
}

async function callViettelPost<T>(
  env: Env,
  path: string,
  init: RequestInit = {},
  options: { requireToken?: boolean } = {},
): Promise<Envelope<T>> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.requireToken) {
    const token = safeTrim(env.VIETTEL_POST_TOKEN);
    if (!token) {
      throw new ViettelPostError('Thiếu VIETTEL_POST_TOKEN nên chưa thể tạo vận đơn Viettel Post.', 400);
    }
    headers.set('Token', token);
  }

  const response = await fetch(`${VIETTEL_POST_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const payload = await parseResponse<T>(response);
  if (!response.ok || payload.error) {
    throw new ViettelPostError(
      pickString(payload.message, `Viettel Post trả lỗi HTTP ${response.status}`),
      response.status || 502,
      payload,
    );
  }

  return payload;
}

function extractExtraServices(candidate: any): ViettelExtraService[] {
  const collections = [
    candidate?.EXTRA_SERVICE,
    candidate?.SERVICE_ADD,
    candidate?.LIST_SERVICE_ADD,
    candidate?.EXTRA_SERVICES,
    candidate?.DICHVU_CONGTHEM,
  ];
  const rawItems = collections.find(Array.isArray) || [];

  return normalizeArray<any>(rawItems)
    .map((item) => ({
      code: pickString(
        item?.MA_DV_CONG_THEM
        ?? item?.MA_DV_CGT
        ?? item?.SERVICE_CODE
        ?? item?.code,
      ),
      name: pickString(
        item?.TEN_DV_CONG_THEM
        ?? item?.TEN_DICHVU
        ?? item?.SERVICE_NAME
        ?? item?.name,
      ),
    }))
    .filter((item) => item.code);
}

function extractQuoteRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.PRICES)) return data.PRICES;
  if (Array.isArray(data?.prices)) return data.prices;
  if (Array.isArray(data?.services)) return data.services;
  return [];
}

function mapQuotedServices(raw: any): ViettelQuotedService[] {
  const rows = extractQuoteRows(raw);
  return rows
    .map((item) => {
      const supportedAddServices = extractExtraServices(item);
      const serviceCode = pickString(
        item?.MA_DV_CHINH
        ?? item?.MA_DICHVU_CHINH
        ?? item?.SERVICE_CODE
        ?? item?.MA_DV
        ?? item?.code,
      );
      const serviceName = pickString(
        item?.TEN_DICHVU
        ?? item?.TEN_DV_CHINH
        ?? item?.SERVICE_NAME
        ?? item?.name,
      );
      return {
        service_code: serviceCode,
        service_name: serviceName || serviceCode,
        fee: pickNumber(item?.GIA_CUOC, item?.GIA, item?.PRICE, item?.MONEY_TOTAL, item?.TOTAL_PRICE),
        eta_text: pickString(item?.THOI_GIAN ?? item?.TIME ?? item?.LEAD_TIME ?? item?.SERVICE_TIME) || null,
        supported_add_codes: supportedAddServices.map((extra) => extra.code),
        supported_add_services: supportedAddServices,
      };
    })
    .filter((item) => item.service_code);
}

function pickRecommendedService(services: ViettelQuotedService[]) {
  const priority = ['VCN', 'SCN', 'STK', 'PHS', 'VTK'];
  for (const code of priority) {
    const matched = services.find((service) => service.service_code === code);
    if (matched) return matched;
  }
  return services[0] || null;
}

function getSenderConfig(env: Env) {
  return {
    groupAddressId: parseInteger(env.VIETTEL_POST_GROUPADDRESS_ID),
    senderName: safeTrim(env.VIETTEL_POST_SENDER_NAME),
    senderPhone: safeTrim(env.VIETTEL_POST_SENDER_PHONE),
    senderAddress: safeTrim(env.VIETTEL_POST_SENDER_ADDRESS),
    senderProvinceId: parseInteger(env.VIETTEL_POST_SENDER_PROVINCE_ID),
    senderDistrictId: parseInteger(env.VIETTEL_POST_SENDER_DISTRICT_ID),
    senderWardId: parseInteger(env.VIETTEL_POST_SENDER_WARD_ID),
  };
}

export function ensureSenderConfigForQuote(env: Env) {
  const config = getSenderConfig(env);
  if (!config.senderProvinceId || !config.senderDistrictId) {
    throw new ViettelPostError(
      'Thiếu VIETTEL_POST_SENDER_PROVINCE_ID hoặc VIETTEL_POST_SENDER_DISTRICT_ID nên chưa thể báo giá.',
      400,
    );
  }
  return config;
}

export function ensureSenderConfigForCreate(env: Env) {
  const config = ensureSenderConfigForQuote(env);
  if (!config.senderName || !config.senderPhone || !config.senderAddress || !config.senderWardId) {
    throw new ViettelPostError(
      'Thiếu cấu hình người gửi Viettel Post. Cần đủ tên, số điện thoại, địa chỉ, tỉnh, quận/huyện và xã/phường.',
      400,
    );
  }
  return config;
}

export async function listViettelPostProvinces(env: Env) {
  const response = await callViettelPost<any[]>(env, '/v2/categories/listProvince');
  return normalizeArray<any>(response.data);
}

async function tryListWithFallback<T>(
  env: Env,
  postPath: string,
  getPath: string,
  body: Record<string, unknown>,
): Promise<T[]> {
  try {
    const response = await callViettelPost<T[]>(env, postPath, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return normalizeArray<T>(response.data);
  } catch (error) {
    const status = (error as ViettelPostError)?.status;
    if (status && status !== 405) {
      throw error;
    }
  }

  const response = await callViettelPost<T[]>(env, getPath, { method: 'GET' });
  return normalizeArray<T>(response.data);
}

export async function listViettelPostDistricts(env: Env, provinceId: number) {
  return tryListWithFallback<any>(
    env,
    '/v2/categories/listDistrict',
    `/v2/categories/listDistrict?provinceId=${provinceId}`,
    { provinceId },
  );
}

export async function listViettelPostWards(env: Env, districtId: number) {
  return tryListWithFallback<any>(
    env,
    '/v2/categories/listWards',
    `/v2/categories/listWards?districtId=${districtId}`,
    { districtId },
  );
}

export async function quoteViettelPostShipment(env: Env, input: QuoteShipmentInput) {
  const sender = ensureSenderConfigForQuote(env);
  const response = await callViettelPost<any>(env, '/v2/order/getPriceAll', {
    method: 'POST',
    body: JSON.stringify({
      SENDER_PROVINCE: sender.senderProvinceId,
      SENDER_DISTRICT: sender.senderDistrictId,
      RECEIVER_PROVINCE: input.receiver_province_id,
      RECEIVER_DISTRICT: input.receiver_district_id,
      RECEIVER_WARD: input.receiver_ward_id || undefined,
      PRODUCT_TYPE: 'HH',
      PRODUCT_WEIGHT: input.product_weight_grams,
      PRODUCT_PRICE: 0,
      MONEY_COLLECTION: 0,
      TYPE: 1,
      NATIONAL_TYPE: 1,
    }),
  });

  const availableServices = mapQuotedServices(response.data);
  const recommendedService = pickRecommendedService(availableServices);
  const recommendedAddCodes = recommendedService?.supported_add_codes.includes('HDN')
    ? ['HDN']
    : [];

  return {
    carrier: 'viettel_post',
    available_services: availableServices,
    recommended_service_code: recommendedService?.service_code || null,
    recommended_service_add_codes: recommendedAddCodes,
    raw: response,
  };
}

function extractCarrierOrderNumber(data: any, fallback: string) {
  return pickString(
    data?.ORDER_NUMBER
    ?? data?.orderNumber
    ?? data?.ORDER_NO
    ?? data?.BILL_NO
    ?? data?.barcode,
    fallback,
  );
}

function extractCarrierTrackingNumber(data: any, fallback: string) {
  return pickString(
    data?.TRACKING_NUMBER
    ?? data?.tracking_number
    ?? data?.ORDER_NUMBER
    ?? data?.BILL_NO
    ?? data?.BARCODE
    ?? data?.ORDER_NO,
    fallback,
  );
}

export async function createViettelPostShipment(env: Env, input: CreateShipmentInput) {
  const sender = ensureSenderConfigForCreate(env);
  const payload: Record<string, unknown> = {
    ORDER_NUMBER: input.order_number,
    SENDER_FULLNAME: sender.senderName,
    SENDER_PHONE: sender.senderPhone,
    SENDER_ADDRESS: sender.senderAddress,
    SENDER_PROVINCE: sender.senderProvinceId,
    SENDER_DISTRICT: sender.senderDistrictId,
    SENDER_WARD: sender.senderWardId,
    RECEIVER_FULLNAME: input.receiver_name,
    RECEIVER_PHONE: input.receiver_phone,
    RECEIVER_ADDRESS: input.address_line,
    RECEIVER_PROVINCE: input.province_id,
    RECEIVER_DISTRICT: input.district_id,
    RECEIVER_WARD: input.ward_id,
    PRODUCT_NAME: input.product_name,
    PRODUCT_DESCRIPTION: input.product_description,
    PRODUCT_QUANTITY: 1,
    PRODUCT_PRICE: input.declared_value || 0,
    PRODUCT_WEIGHT: input.product_weight_grams,
    PRODUCT_TYPE: 'HH',
    MONEY_COLLECTION: 0,
    ORDER_PAYMENT: 3,
    TYPE: 1,
    MA_DV_CHINH: input.service_code,
    LIST_ITEM: [
      {
        PRODUCT_NAME: input.product_name,
        PRODUCT_QUANTITY: 1,
        PRODUCT_PRICE: input.declared_value || 0,
        PRODUCT_WEIGHT: input.product_weight_grams,
      },
    ],
  };

  if (sender.groupAddressId) {
    payload.GROUPADDRESS_ID = sender.groupAddressId;
  }
  if (input.service_add_codes.length) {
    payload.MA_DV_CONG_THEM = input.service_add_codes.join(',');
  }

  const response = await callViettelPost<any>(
    env,
    '/v2/order/createOrder',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    { requireToken: true },
  );

  const data = response.data || {};
  return {
    carrier_order_number: extractCarrierOrderNumber(data, input.order_number),
    carrier_tracking_number: extractCarrierTrackingNumber(data, input.order_number),
    shipping_fee: pickNumber(
      data?.MONEY_TOTAL,
      data?.TOTAL_MONEY,
      data?.TOTAL_PRICE,
      data?.GIA_CUOC,
      data?.PRICE,
    ),
    raw: response,
    request_payload: payload,
  };
}

export function getViettelPostErrorMessage(error: unknown) {
  if (error instanceof ViettelPostError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Không thể kết nối Viettel Post.';
}
