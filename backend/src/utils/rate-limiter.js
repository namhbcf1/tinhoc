export function createRateLimiter(options = {}) {
    void options;
    return async (c, next) => {
        void c;
        await next();
    };
}
export const strictRateLimiter = createRateLimiter();
export const moderateRateLimiter = createRateLimiter();
export const lenientRateLimiter = createRateLimiter();
export const loginRateLimiter = createRateLimiter();
