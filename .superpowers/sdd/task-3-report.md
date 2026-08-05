# Task 3 report: Canonical order phones and protected public lookup

## Status

Complete. Checkout creation and safe customer updates store canonical Vietnamese phone numbers; idempotency fingerprints, keys, shipping input, persistence, and public lookup share the same canonical customer. Public lookup returns only the masked/minimal DTO. The shared limiter now uses atomic MongoDB buckets with SHA-256 identifiers and exact one-hop proxy trust.

## RED evidence

1. `cd backend && npx jest tests/order-dashboard.test.js --runInBand`
   - 1 suite failed; 2 tests failed, 24 passed.
   - Expected failures: checkout returned `0911 111 111` instead of canonical `0911111111`; a canonical-equivalent retry returned 409 because its request fingerprint differed.
2. `cd backend && npx jest tests/order-dashboard.test.js --runInBand`
   - 1 suite failed; 5 tests failed, 26 passed.
   - Expected failures: request 11 remained 404 instead of 429; persistent limiter model/repository did not exist; `trust proxy` was `false` instead of `1`.
3. `cd backend && npx jest tests/order-dashboard.test.js --runInBand -t "safe shipping edits"`
   - 1 test failed, 30 skipped.
   - Expected failure: authenticated safe customer update persisted `+84 904 343 434` instead of canonical `0904343434`.

## GREEN evidence

1. `cd backend && npx jest tests/order-dashboard.test.js --runInBand`
   - 1 suite passed; 26/26 tests passed after the canonical storage/fingerprint and public DTO cycle.
2. `cd backend && npx jest tests/order-dashboard.test.js --runInBand -t "rate limits repeated|atomically allows|safely rejects|persists only hashed|trusts exactly"`
   - 1 suite passed; 5/5 focused tests passed, 26 skipped.
   - The concurrent repository test allowed exactly 10 of 15 simultaneous consumers; the exhausted-bucket call resolved as denied; request 11 returned 429 with `Retry-After`; persisted identifiers were 64-character SHA-256 hashes.
3. `cd backend && npx jest tests/order-dashboard.test.js --runInBand -t "safe shipping edits"`
   - 1/1 focused test passed, 30 skipped.
4. `cd backend && npx jest tests/order-dashboard.test.js tests/auth.test.js --runInBand`
   - 2 suites passed; 44/44 tests passed.
5. `cd frontend && npm run lint`
   - Passed with no ESLint findings.
6. `cd frontend && npm run test:run`
   - 41 files passed; 127/127 tests passed.
7. `git diff --check`
   - Passed; no whitespace errors.

## Files

- `backend/src/app.js`
- `backend/src/models/RateLimitBucket.js`
- `backend/src/repositories/rateLimitRepository.js`
- `backend/src/middlewares/rateLimit.js`
- `backend/src/routes/orderRoutes.js`
- `backend/src/services/orderService.js`
- `backend/src/repositories/orderRepository.js`
- `backend/tests/order-dashboard.test.js`
- `frontend/src/pages/OrderLookup.jsx`

## Commit

`fix: normalize phones and protect order lookup` (Task 3 implementation commit; SHA is reported in the handoff because a commit cannot contain its own final SHA.)

## Self-review

- Verified the route remains in the established route -> controller -> service -> repository -> model flow; cross-cutting rate-limit middleware delegates persistence to its repository.
- Verified authenticated create/list/get/update APIs retain their full order payloads; only the unauthenticated lookup uses the masked DTO.
- Verified canonicalization occurs before request fingerprinting, idempotency-key principal construction, shipping calculation, create persistence, update persistence, and lookup repository access.
- Verified all persisted limiter keys, including existing auth limiter identities, are hashed before MongoDB storage.
- Verified the aggregation update is atomic and the duplicate-key path distinguishes a winning retry from an exhausted active bucket instead of surfacing a 500/409.
- Verified TTL cleanup is not required for correctness: expired buckets reset atomically based on `resetAt`; TTL removes stale records later.
- Verified `app.set('trust proxy', 1)` matches the selected Render one-hop topology rather than trusting arbitrary proxies.

## Concerns

- Historical orders that already contain non-canonical phone strings may need a one-time data migration; this task canonicalizes all new creates and subsequent safe customer updates but does not rewrite existing production records.
