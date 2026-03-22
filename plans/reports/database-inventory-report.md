# Database & Inventory Report

## 1. Schema Analysis
- Mismatch detected: Active codebase (`backend/schema.sql`) contains Educational/School Management System (`admins`, `students`, `classes`, `registrations`, `payments`, `documents`).
- NOT "Trường Phát Computer" retail platform.
- `products` and `serial_numbers` tables missing entirely.

## 2. Serial-First Inventory Logic
- Verification failed: Target tables DO NOT exist in D1 schema.
- No quantity vs dynamic COUNT logic found.

## 3. 4-Tier Pricing Implementation
- Verification failed: Pricing columns (`cost_price`, `wholesale_price`, `price_internal`, `price_retail`) NOT in schema.

## 4. Parameterized Queries (?) & SELECT *
- `backend/schema.sql` is DDL only. 
- Glob search for architectural layer `**/lib/repositories/**/*.ts` returned 0 files.
- Unable to audit raw queries for `?` parameterization or `SELECT *` blocks due to missing repo files.

## Unresolved Questions
- Is the "Trường Phát Computer" Next.js/D1 codebase located in a different directory or branch?
- Where are the repository API files (`lib/repositories/`) actually stored?
