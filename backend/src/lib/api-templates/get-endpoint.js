export function createGetEndpoint(config) {
    return async (c) => {
        try {
            let params = {};
            let query = {};
            if (config.params) {
                const parsedParams = config.params.safeParse(c.req.param());
                if (!parsedParams.success) {
                    return c.json({
                        success: false,
                        error: {
                            message: 'Dữ liệu params không hợp lệ',
                            code: 'VALIDATION_ERROR_PARAMS',
                            details: parsedParams.error.format(),
                        },
                    }, 400);
                }
                params = parsedParams.data;
            }
            if (config.query) {
                const parsedQuery = config.query.safeParse(c.req.query());
                if (!parsedQuery.success) {
                    return c.json({
                        success: false,
                        error: {
                            message: 'Dữ liệu query không hợp lệ',
                            code: 'VALIDATION_ERROR_QUERY',
                            details: parsedQuery.error.format(),
                        },
                    }, 400);
                }
                query = parsedQuery.data;
            }
            const response = await config.handler(c, { params, query });
            if (response && typeof response === 'object' && 'success' in response) {
                const status = response.success ? 200 : (response.error?.code === 'NOT_FOUND' ? 404 : 400);
                if (config.cacheControl && status === 200) {
                    c.header('Cache-Control', config.cacheControl);
                }
                return c.json(response, status);
            }
            let payload;
            if (response && typeof response === 'object' && !Array.isArray(response)) {
                if ('data' in response || 'token' in response) {
                    payload = { success: true, ...response };
                }
                else {
                    payload = { success: true, data: response };
                }
            }
            else {
                payload = { success: true, data: response };
            }
            if (config.cacheControl) {
                c.header('Cache-Control', config.cacheControl);
            }
            return c.json(payload, 200);
        }
        catch (error) {
            console.error('[GET Endpoint Error]', error);
            const isValidation = error.message && error.message !== 'Lỗi máy chủ nội bộ' && !error.message.includes('not available');
            return c.json({
                success: false,
                error: {
                    message: error.message || 'Lỗi máy chủ nội bộ',
                    code: isValidation ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR',
                },
            }, isValidation ? 400 : 500);
        }
    };
}
