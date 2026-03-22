import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseCCCDExtraction,
  parseCCCDExtractionPayload,
} from '../../services/cccd-ocr-parser.js';
import { extractRegistrationPrefillFromImage } from '../../services/cccd-ocr-service.js';

describe('CCCD OCR parser', () => {
  it('parses JSON-like output with bare keys and trailing commas', () => {
    const parsed = parseCCCDExtraction(`
      {
        cccd: "012345678901",
        full_name: "NGUYEN VAN A",
        date_of_birth: "01-02-2000",
        gender: "Nam",
        place_of_origin: "Ha Noi",
      }
    `);

    expect(parsed).toMatchObject({
      cccd: '012345678901',
      fullName: 'NGUYEN VAN A',
      dateOfBirth: '01/02/2000',
      gender: 'Nam',
      placeOfOrigin: 'Ha Noi',
    });
  });

  it('parses labeled plain text output when JSON parsing fails', () => {
    const parsed = parseCCCDExtraction(`
      CCCD: 079203001234
      Full name: TRAN THI B
      Date of birth: 05/11/2001
      Gender: Nu
      Place of residence: Da Nang
      Issue date: 15/08/2021
    `);

    expect(parsed).toMatchObject({
      cccd: '079203001234',
      fullName: 'TRAN THI B',
      dateOfBirth: '05/11/2001',
      gender: 'Nữ',
      placeOfResidence: 'Da Nang',
      issueDate: '15/08/2021',
    });
  });

  it('parses structured object payloads from Workers AI json_schema output', () => {
    const parsed = parseCCCDExtractionPayload({
      cccd: '079203001234',
      full_name: 'LE VAN C',
      date_of_birth: '03/09/1999',
      gender: 'Male',
    });

    expect(parsed).toMatchObject({
      cccd: '079203001234',
      fullName: 'LE VAN C',
      dateOfBirth: '03/09/1999',
      gender: 'Male',
    });
  });
});

describe('extractRegistrationPrefillFromImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses OCR.space engine 2 in Vietnamese when extraction succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [
          {
            ParsedText: [
              'CĂN CƯỚC CÔNG DÂN',
              'Số 079203001234',
              'Họ và tên: NGUYỄN VĂN A',
              'Ngày sinh: 09/12/2002',
            ].join('\n'),
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    const result = await extractRegistrationPrefillFromImage(
      env,
      'cccd-uploads/cccd_front/test.jpg',
      'cccd_front'
    );

    expect(result.prefill).toMatchObject({
      cccd: '079203001234',
      fullName: 'NGUYỄN VĂN A',
      dateOfBirth: '09/12/2002',
    });
    expect(result.model).toBe('OCR.space');
    expect(result.debug.ocrSpaceAttempts).toHaveLength(1);
    expect(result.debug.ocrSpaceAttempts[0]).toMatchObject({
      engine: '2',
      language: 'eng',
      status: 'success',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries OCR.space with engine 1 in Vietnamese if engine 2 fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          OCRExitCode: 3,
          IsErroredOnProcessing: true,
          ErrorMessage: ['engine 2 failed'],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          OCRExitCode: 1,
          IsErroredOnProcessing: false,
          ParsedResults: [
            {
              ParsedText: [
                'Quê quán: Hà Nội',
                'Nơi thường trú: Cầu Giấy, Hà Nội',
                'Ngày cấp: 15/08/2021',
              ].join('\n'),
            },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    const result = await extractRegistrationPrefillFromImage(
      env,
      'cccd-uploads/cccd_back/test.jpg',
      'cccd_back'
    );

    expect(result.model).toBe('OCR.space');
    expect(result.prefill).toMatchObject({
      issueDate: '15/08/2021',
      placeOfOrigin: 'Hà Nội',
      placeOfResidence: 'Cầu Giấy, Hà Nội',
    });
    expect(result.debug.ocrSpaceAttempts).toEqual([
      {
        engine: '2',
        language: 'eng',
        status: 'failed',
        error: 'OCR.space: engine 2 failed',
      },
      {
        engine: '1',
        language: 'eng',
        status: 'success',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns timeout diagnostics when OCR.space hangs', async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    );

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    const promise = extractRegistrationPrefillFromImage(
      env,
      'cccd-uploads/cccd_front/test.jpg',
      'cccd_front'
    );

    await expect(promise).rejects.toThrow('OCR.space timeout');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects oversized images before calling OCR.space', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array(1024 * 1024 + 1).buffer,
        }),
      },
    } as any;

    await expect(
      extractRegistrationPrefillFromImage(env, 'cccd-uploads/cccd_front/test.jpg', 'cccd_front')
    ).rejects.toThrow('Ảnh quá lớn');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats OCR text without recognizable fields as failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [{ ParsedText: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' }],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    await expect(
      extractRegistrationPrefillFromImage(env, 'cccd-uploads/cccd_front/test.jpg', 'cccd_front')
    ).rejects.toThrow('OCR đọc được text nhưng không nhận diện được trường CCCD nào');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('parses useful back-side data without requiring cccd or full name', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [
          {
            ParsedText: [
              'Quê quán: Hà Nội',
              'Nơi thường trú: Cầu Giấy, Hà Nội',
              'Ngày cấp 15/08/2021',
            ].join('\n'),
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    const result = await extractRegistrationPrefillFromImage(
      env,
      'cccd-uploads/cccd_back/test.jpg',
      'cccd_back'
    );

    expect(result.model).toBe('OCR.space');
    expect(result.prefill).toMatchObject({
      issueDate: '15/08/2021',
      placeOfOrigin: 'Hà Nội',
      placeOfResidence: 'Cầu Giấy, Hà Nội',
    });
  });

  it('extracts the actual front-side sample OCR into autofill-ready fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [
          {
            ParsedText: [
              'Có giá trị đến 29/08/2029',
              'Date of expiry',
              'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
              'CĂN CƯỚC CÔNG DÂN',
              'Số / No.: 026204008344',
              'Họ và tên / Full name:',
              'NGỤY CÔNG KẾT',
              'Ngày sinh / Date of birth: 29/08/2004',
              'Giới tính / Sex: Nam Quốc tịch / Nationality: Việt Nam',
              'Quê quán / Place of origin:',
              'Liễn Sơn, Lập Thạch, Vĩnh Phúc',
              'Nơi thường trú / Place of residence. Thôn Đồng Ngõa',
              'Liễn Sơn, Lập Thạch, Vĩnh Phúc',
            ].join('\n'),
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    const result = await extractRegistrationPrefillFromImage(
      env,
      'cccd-uploads/cccd_front/test.jpg',
      'cccd_front'
    );

    expect(result.prefill).toMatchObject({
      cccd: '026204008344',
      fullName: 'NGỤY CÔNG KẾT',
      dateOfBirth: '29/08/2004',
      gender: 'Nam',
      nationality: 'Việt Nam',
      placeOfOrigin: 'Liễn Sơn, Lập Thạch, Vĩnh Phúc',
      placeOfResidence: 'Thôn Đồng Ngõa, Liễn Sơn, Lập Thạch, Vĩnh Phúc',
    });
  });

  it('extracts the actual back-side sample OCR into issue date', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [
          {
            ParsedText: [
              'Đặc điểm nhân dạng / Personal identification:',
              'Nót ruồi C: 1cm trên sau cánh',
              'mùi phải',
              'Ngày, tháng, năm / Date, month, year:27/06/2021',
              'Phạm Công Nguyên',
              'IDVNM2040083443026204008344<',
              '<5',
              '0408293M2908292VNM<<<<<<<<<<<2',
              'NGUY <<CONG<KET<<<<<<<<<<',
            ].join('\n'),
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);
    const env = {
      R2: {
        get: vi.fn().mockResolvedValue({
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }),
      },
    } as any;

    const result = await extractRegistrationPrefillFromImage(
      env,
      'cccd-uploads/cccd_back/test.jpg',
      'cccd_back'
    );

    expect(result.prefill).toMatchObject({
      cccd: '',
      fullName: '',
      issueDate: '27/06/2021',
    });
  });
});
