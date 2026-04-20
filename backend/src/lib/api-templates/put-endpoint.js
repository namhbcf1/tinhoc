export function createPutEndpoint(config) {
    return async (c) => {
        try {
            let params = {};
            let query = {};
            let body = {};
            if (config.params) {
                const parsedParams = config.params.safeParse(c.req.param());
                if (!parsedParams.success) {
                    return c.json({ success: false, error: { message: 'Dữ liệu params không hợp lệ', code: 'VALIDATION_ERROR_PARAMS', details: parsedParams.error.format() } }, 400);
                }
                params = parsedParams.data;
            }
            if (config.query) {
                const parsedQuery = config.query.safeParse(c.req.query());
                if (!parsedQuery.success) {
                    return c.json({ success: false, error: { message: 'Dữ liệu query không hợp lệ', code: 'VALIDATION_ERROR_QUERY', details: parsedQuery.error.format() } }, 400);
                }
                query = parsedQuery.data;
            }
            if (config.body) {
                let rawBody = {};
                try {
                    rawBody = await c.req.json();
                }
                catch (e) { }
                const parsedBody = config.body.safeParse(rawBody);
                if (!parsedBody.success) {
                    return c.json({ success: false, error: { message: 'Dữ liệu body không hợp lệ', code: 'VALIDATION_ERROR_BODY', details: parsedBody.error.format() } }, 400);
                }
                body = parsedBody.data;
            }
            const response = await config.handler(c, { params, query, body });
            if (response && typeof response === 'object' && 'success' in response) {
                const status = response.success ? 200 : (response.error?.code === 'NOT_FOUND' ? 404 : 400);
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
            return c.json(payload, 200);
        }
        catch (error) {
            console.error('[PUT Endpoint Error]', error);
            const isValidation = error.message && error.message !== 'Lỗi máy chủ nội bộ' && !error.message.includes('not available');
            return c.json({ success: false, error: { message: error.message || 'Lỗi máy chủ nội bộ', code: isValidation ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR' } }, isValidation ? 400 : 500);
        }
    };
}
