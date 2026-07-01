# Student Login Identifier Design

## Goal
Allow students to register and log in when phone numbers or email addresses are shared, while keeping CCCD as the unique student identity.

## Scope
- Apply the canonical auth behavior in `vantrangedu`, because it is the SSO broker for `vantrangexam`.
- Keep `students.cccd` unique.
- Allow duplicate `students.sdt` and duplicate `students.email`.
- Let the existing login form use CCCD plus a second identifier field that accepts either phone number or email.

## Behavior
- Registration and admin-created student records only reject duplicate CCCD.
- Student login accepts `{ cccd, sdt }` from the existing API shape, but treats `sdt` as a generic identifier.
- Login succeeds when the CCCD matches a student and the identifier equals either that student's phone number or email address.
- Email comparison is case-insensitive after trimming whitespace.
- Phone comparison trims whitespace and keeps the current stored format behavior.
- If CCCD exists but the identifier does not match that same student, return the existing invalid-login response.

## Cross-App Flow
- `vantrangexam` should continue posting credentials to its `/api/auth/login` endpoint.
- `vantrangexam` forwards the body to `vantrangedu` `/sso/direct-login`, so broker-side login logic remains the source of truth.
- Frontend labels/placeholders in both apps should say “Số điện thoại hoặc email” where they currently imply phone-only login.

## Data Model
No schema migration is needed for phone/email uniqueness unless a later audit finds explicit unique indexes on `students.sdt` or `students.email`. The existing `students.cccd TEXT NOT NULL UNIQUE` rule remains unchanged.

## Tests
- Duplicate CCCD registration remains rejected.
- Duplicate phone registration is accepted when CCCD differs.
- Duplicate email registration is accepted when CCCD differs.
- Login with CCCD + phone succeeds.
- Login with CCCD + email succeeds.
- Login with CCCD + another student's shared phone/email only succeeds for the student whose CCCD is supplied.
