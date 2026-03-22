## Code Review Summary

### Scope
- **Files reviewed:**
  - `backend/src/index.js`
  - `backend/src/utils/helpers.js`
  - `backend/src/routes/cccd-upload.js`
  - `backend/src/routes/auth.js`
  - `backend/src/routes/documents.js`
  - `backend/src/services/document-service.ts`
- **Focus:** Complete security audit, hardening backend logic, JWT flaws, rate limiting, and ID upload logic.

### Overall Assessment
The custom backend on Cloudflare Workers/Hono contains a fairly secure structure with Cloudflare D1 query bindings preventing most traditional SQL injections. However, there were some missing endpoint access controls, globally disabled rate-limiter, and lack of robustness in processing incoming JWTs which opened up potential DoS or unauthorized access.

### Critical Issues
1. **Unsecured CCCD/Image Deletion Endpoint**: The `DELETE /api/cccd-upload/:imageId` endpoint had a `TODO` for admin authentication, leaving image deletion fully public. Anyone could delete uploaded sensitive CCCD images if they had the `imageId`.
   - *Fix applied*: Implemented robust JWT parsing and role-based checks (requiring `admin` or `super_admin`) to protect the endpoint directly in `cccd-upload.js`.

### High Priority
1. **Disabled Rate-Limiting**: Global and per-route rate limiting middlewares were disabled (commented out "FOR TESTING"). This opened the API to DDoS attacks and brute-forcing.
   - *Fix applied*: Re-enabled `moderateRateLimiter` globally, and `strictRateLimiter` selectively on sensitive endpoints like `/payments` and `/homepage` within `index.js`.
2. **Brittle JWT Parsing Logic**: The `verifyJWT` split the token via `.` and blindly assigned the parts without validating the array's length. Malformed short strings used as tokens could cause `atob` undefined crashes.
   - *Fix applied*: Handled malformed JWT structures gracefully by verifying segment count before decoding in `utils/helpers.js`.

### Medium Priority
1. **Security considerations for Document access**: Endpoints like `GET /cccd/:cccd` are currently exposing documents if a matched string is found. While typically safe because CCCDs are secrets, it lacks direct auth. Not patched directly as this might be intentional public functionality for student self-service lookups, but should be noted by the system architects.

### Positive Observations
- Usage of `c.env.DB.prepare(...).bind(...)` accurately mitigates SQL Injection across the backend interface dynamically.
- Clear and separated role bindings within middleware constraints for other standard endpoints.

### Recommended Actions
1. Ensure `c.env.JWT_SECRET` is never logged and rotate it periodically.
2. Monitor R2 and Cloudflare Images bucket configurations for misconfigured public objects.
3. Review ID/CCCD document retrieval `/cccd/:cccd` endpoint to see if an additional OTP or Date-of-Birth verification is required.

### Unresolved Questions
- Is the lack of authentication on `/documents/student` and `/documents/cccd/:cccd` intentional for a public portal lookup, or should it be wrapped in strict student authentication contexts?