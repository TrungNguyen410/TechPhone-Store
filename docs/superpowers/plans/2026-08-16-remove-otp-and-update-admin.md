# Remove OTP And Update Admin Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every visible and callable OTP flow, make registration direct, and set the demo administrator phone and password to `0918550811`.

**Architecture:** Preserve the existing frontend API abstraction and backend `route -> controller -> service -> repository -> model` chain. Frontend registration calls one `register(payload)` interface in mock and API modes; backend registration creates a customer directly and returns the public user without a session. OTP routes and their now-unreferenced implementation files are removed, while existing MongoDB OTP records are left untouched.

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library, Express 5, Mongoose 9, Jest, Supertest, bcrypt.

## Global Constraints

- No visible page, link, input, message, or reachable public API may ask for, send, or verify an OTP.
- Administrator phone and password are both exactly `0918550811`.
- Customer demo credentials and authenticated password changes must remain unchanged.
- Public registration must never accept caller-controlled role, status, email, or verification fields.
- Existing MongoDB records are not rewritten at application startup.
- Follow TDD: add a failing behavior test, observe the expected failure, add minimal production code, and rerun the focused test.

---

## File Map

- `backend/src/services/authService.js`: direct customer registration and login eligibility.
- `backend/src/controllers/authController.js`: HTTP 201 registration response.
- `backend/src/routes/authRoutes.js`: expose only direct registration, login, session, profile, password-change, and wishlist auth routes.
- `backend/src/validators/authValidators.js`: retain registration/login/account validators and remove OTP validators.
- `backend/src/config/swagger.js`: document direct registration and remove OTP schemas/paths.
- `backend/src/models/VerificationCode.js`, `backend/src/repositories/verificationCodeRepository.js`, `backend/src/services/otpDeliveryService.js`: remove unused OTP implementation.
- `backend/tests/auth.test.js`: direct registration and unreachable OTP route coverage.
- `backend/tests/otp-delivery-service.test.js`: remove obsolete OTP service coverage.
- `frontend/src/api/authApi.js`: provide `register(payload)` and remove OTP/reset methods.
- `frontend/src/context/AuthContext.jsx`: provide direct `register(payload)` without persisting a session.
- `frontend/src/pages/Register.jsx`: one-step registration form.
- `frontend/src/pages/Login.jsx`: no forgot-password link and updated admin shortcut.
- `frontend/src/pages/ForgotPassword.jsx`: remove obsolete page.
- `frontend/src/routes/AppRoutes.jsx`: remove forgot-password lazy import and route.
- `frontend/src/components/common/RouteMeta.jsx`: remove forgot-password metadata and OTP wording.
- `frontend/src/mock/mockDb.js`: remove OTP behavior and migrate the persisted administrator record.
- `frontend/src/mock/mockUsers.js`: new administrator credentials.
- `frontend/src/utils/constants.js`, `frontend/src/assets/styles/main.css`: remove OTP-only storage/style definitions.
- `frontend/src/pages/PhoneAuthPages.test.jsx`, `frontend/src/mock/mockAuthOtp.test.js`, `frontend/src/api/axiosClient.test.js`, `frontend/src/pages/Login.test.jsx`, `frontend/src/routes/AppRoutes.test.jsx`: replace OTP assertions with direct registration, hidden-route, and credential coverage.
- `backend/src/seed/seed.js`, `backend/tests/seed-startup.test.js`: use a dedicated administrator hash and remove verification-code cleanup.

### Task 1: Direct Backend Registration And Retire OTP Endpoints

**Files:**
- Modify: `backend/tests/auth.test.js`
- Modify: `backend/src/services/authService.js`
- Modify: `backend/src/controllers/authController.js`
- Modify: `backend/src/routes/authRoutes.js`
- Modify: `backend/src/validators/authValidators.js`

**Interfaces:**
- Consumes: `userRepository.findByPhone(phone)`, `userRepository.create(payload)`, `normalizeVietnamesePhone(value)`.
- Produces: `authService.register(payload) -> Promise<publicUser>` and `POST /api/auth/register -> HTTP 201 { success, message, data: user }`.

- [ ] **Step 1: Replace the first OTP backend test with direct-registration behavior and add unreachable-route assertions**

```js
it('creates a customer directly without OTP and allows login', async () => {
  const registered = await request(app).post('/api/auth/register').send({
    fullName: 'Nguyen Minh Anh',
    phone: '+84912345678',
    password: '123456',
  });

  expect(registered.status).toBe(201);
  expect(registered.body.data).toMatchObject({ phone: '0912345678', role: 'customer' });
  expect(registered.body.data.password).toBeUndefined();

  const loggedIn = await request(app).post('/api/auth/login').send({
    identifier: '0912345678',
    password: '123456',
  });
  expect(loggedIn.status).toBe(200);
});

it.each([
  '/api/auth/register/request-otp',
  '/api/auth/register/verify-otp',
  '/api/auth/forgot-password/request-otp',
  '/api/auth/forgot-password/reset',
])('does not expose removed OTP endpoint %s', async (path) => {
  expect((await request(app).post(path).send({})).status).toBe(404);
});
```

Remove the password-reset OTP, concurrent OTP-consumption, and legacy OTP-contract tests. Keep the existing admin-role and duplicate-phone registration tests so the new direct route must satisfy them.

- [ ] **Step 2: Run the focused backend tests and verify the direct registration assertion fails**

Run: `cd backend; npx jest tests/auth.test.js --runInBand`

Expected: FAIL because `/api/auth/register` returns 202 and does not create a user directly; removed OTP routes still return non-404 responses.

- [ ] **Step 3: Implement minimal direct registration through every backend layer**

In `authService.js`, remove OTP imports and methods and implement:

```js
async register(payload) {
  const phone = normalizeVietnamesePhone(payload.phone);
  if (!phone) throw new AppError('Số điện thoại Việt Nam không hợp lệ', 422);
  if (await userRepository.findByPhone(phone)) {
    throw new AppError('Số điện thoại này đã được đăng ký', 409);
  }
  const password = await bcrypt.hash(payload.password, 12);
  const user = await userRepository.create({
    fullName: payload.fullName,
    phone,
    password,
    role: 'customer',
    status: 'active',
  });
  return publicUser(user);
}
```

Remove the `phoneVerified === false` login rejection. In the controller, call `authService.register(req.body)` and return HTTP 201. In routes, keep only `POST /register` with the existing registration validator and rate limiter; delete all OTP and forgot-password routes/limiters. Remove OTP/reset validator declarations and exports.

- [ ] **Step 4: Run the focused backend tests and verify green**

Run: `cd backend; npx jest tests/auth.test.js --runInBand`

Expected: PASS with all `Auth API` tests green.

- [ ] **Step 5: Commit the backend behavior slice**

```powershell
git add -- backend/tests/auth.test.js backend/src/services/authService.js backend/src/controllers/authController.js backend/src/routes/authRoutes.js backend/src/validators/authValidators.js
git commit -m "feat: replace OTP with direct registration"
```

### Task 2: One-Step Frontend Registration And Hidden Recovery UI

**Files:**
- Modify: `frontend/src/pages/PhoneAuthPages.test.jsx`
- Modify: `frontend/src/api/axiosClient.test.js`
- Modify: `frontend/src/pages/Login.test.jsx`
- Modify: `frontend/src/routes/AppRoutes.test.jsx`
- Modify: `frontend/src/api/authApi.js`
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/pages/Register.jsx`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/routes/AppRoutes.jsx`
- Modify: `frontend/src/components/common/RouteMeta.jsx`
- Delete: `frontend/src/pages/ForgotPassword.jsx`

**Interfaces:**
- Consumes: `authApi.register(payload)` from the frontend API layer.
- Produces: `AuthContext.register(payload) -> Promise<publicUser>` and a one-submit registration page that redirects to `/login`.

- [ ] **Step 1: Write frontend tests for direct registration and hidden password recovery**

Mock `useAuth` with `register: vi.fn().mockResolvedValue({ phone: '0966666666' })`. Assert that the registration page contains phone/password fields but no text matching `/OTP|SMS/i`, and submit the form with Testing Library to assert:

```js
expect(register).toHaveBeenCalledWith({
  fullName: 'Direct User',
  phone: '0966666666',
  password: '123456',
});
```

Update the public-auth-request test in `axiosClient.test.js` to call `authApi.register(...)` and expect `/auth/register`, with no OTP or forgot-password requests. Update the login test to assert `queryByRole('link', { name: /quên mật khẩu/i })` is absent. Update the route test to visit `/forgot-password` and assert the not-found page is rendered.

- [ ] **Step 2: Run focused frontend tests and verify red**

Run: `cd frontend; npm run test:run -- src/pages/PhoneAuthPages.test.jsx src/api/axiosClient.test.js src/pages/Login.test.jsx src/routes/AppRoutes.test.jsx`

Expected: FAIL because `register` is not exposed, OTP text/link/route remain, and the API still calls OTP endpoints.

- [ ] **Step 3: Implement the direct frontend registration contract**

In `authApi.js` expose:

```js
register: (payload) =>
  USE_MOCK
    ? mockDb.register(payload)
    : axiosClient.post('/auth/register', payload, skipAuthRefresh),
```

Remove all OTP and password-reset API methods. In `AuthContext`, expose `register` as a direct callback without session persistence. Simplify `Register` to one form submit that strips `confirmPassword`, awaits `register(payload)`, shows a success toast, and navigates to `/login`. Remove every OTP state, icon, branch, label, and message.

Remove the forgot-password link, lazy import, route, and route metadata. Delete `ForgotPassword.jsx`. Change register metadata to `Tạo tài khoản TechPhone bằng số điện thoại và mật khẩu.`

- [ ] **Step 4: Run focused frontend tests and verify green**

Run: `cd frontend; npm run test:run -- src/pages/PhoneAuthPages.test.jsx src/api/axiosClient.test.js src/pages/Login.test.jsx src/routes/AppRoutes.test.jsx`

Expected: PASS for all four files.

- [ ] **Step 5: Commit the frontend flow slice**

```powershell
git add -- frontend/src/pages/PhoneAuthPages.test.jsx frontend/src/api/axiosClient.test.js frontend/src/pages/Login.test.jsx frontend/src/routes/AppRoutes.test.jsx frontend/src/api/authApi.js frontend/src/context/AuthContext.jsx frontend/src/pages/Register.jsx frontend/src/pages/Login.jsx frontend/src/routes/AppRoutes.jsx frontend/src/components/common/RouteMeta.jsx frontend/src/pages/ForgotPassword.jsx
git commit -m "feat: hide OTP flows from storefront"
```

### Task 3: Update Administrator Credentials And Persisted Mock Migration

**Files:**
- Modify: `frontend/src/mock/mockAuthOtp.test.js` (rename to `frontend/src/mock/mockAuth.test.js`)
- Modify: `frontend/src/mock/mockDb.js`
- Modify: `frontend/src/mock/mockUsers.js`
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `backend/tests/seed-startup.test.js`
- Modify: `backend/src/seed/seed.js`

**Interfaces:**
- Produces: `migrateMockUsers(users) -> users` applied whenever the mock user collection is read.
- Produces: fresh seed administrator `{ phone: '0918550811' }` hashed from the same string.

- [ ] **Step 1: Replace mock OTP tests with direct registration and credential migration tests**

Rename the test file and add:

```js
it('registers a customer directly without verification state', async () => {
  const user = await mockDb.register({
    fullName: 'Direct User',
    phone: '0966666666',
    password: '123456',
  });
  expect(user).toMatchObject({ phone: '0966666666', role: 'customer' });
  expect(user.phoneVerified).toBeUndefined();
});

it('migrates persisted administrator credentials', async () => {
  localStorage.setItem('mock_users', JSON.stringify([{
    id: 'user-admin', role: 'admin', phone: '0900000000', password: '123456',
  }]));
  const session = await mockDb.login('0918550811', '0918550811');
  expect(session.user).toMatchObject({ id: 'user-admin', phone: '0918550811' });
});
```

Extend `seed-startup.test.js` so `bcrypt.hash` resolves different values by input and assert `User.insertMany` receives an admin with phone `0918550811`; assert the hash function is called with `0918550811`.

- [ ] **Step 2: Run focused credential tests and verify red**

Run: `cd frontend; npm run test:run -- src/mock/mockAuth.test.js src/pages/Login.test.jsx`

Run: `cd backend; npx jest tests/seed-startup.test.js --runInBand`

Expected: FAIL because the old mock/seed administrator credentials remain and persisted users are not migrated.

- [ ] **Step 3: Implement credential updates and narrow mock migration**

Set the `user-admin` mock record and login shortcut to phone/password `0918550811`. Add a pure helper near the mock collection definitions:

```js
const migrateMockUsers = (users) => users.map((user) => (
  user.id === 'user-admin'
    ? { ...user, phone: '0918550811', password: '0918550811' }
    : user
));
```

When `read('users')` finds persisted data, apply the helper, write only if changed, and return a clone. Do not modify any non-admin record.

In `seed.js`, calculate a separate administrator hash:

```js
const password = await bcrypt.hash(resolveSeedPassword(), 12);
const adminPassword = await bcrypt.hash('0918550811', 12);
```

Use `adminPassword` only on `user-admin`, set its phone to `0918550811`, and leave all customer records on `password`.

- [ ] **Step 4: Run focused credential tests and verify green**

Run: `cd frontend; npm run test:run -- src/mock/mockAuth.test.js src/pages/Login.test.jsx`

Run: `cd backend; npx jest tests/seed-startup.test.js --runInBand`

Expected: PASS for both frontend and backend focused suites.

- [ ] **Step 5: Commit the credential slice**

```powershell
git add -- frontend/src/mock/mockAuthOtp.test.js frontend/src/mock/mockAuth.test.js frontend/src/mock/mockDb.js frontend/src/mock/mockUsers.js frontend/src/pages/Login.jsx backend/tests/seed-startup.test.js backend/src/seed/seed.js
git commit -m "feat: update demo administrator credentials"
```

### Task 4: Remove Dead OTP Code And Verify The Repository

**Files:**
- Modify: `backend/src/config/swagger.js`
- Modify: `frontend/src/utils/constants.js`
- Modify: `frontend/src/assets/styles/main.css`
- Modify: `backend/src/seed/seed.js`
- Modify: `backend/tests/seed-startup.test.js`
- Modify: `frontend/src/mock/mockDb.js`
- Delete: `backend/src/models/VerificationCode.js`
- Delete: `backend/src/repositories/verificationCodeRepository.js`
- Delete: `backend/src/services/otpDeliveryService.js`
- Delete: `backend/tests/otp-delivery-service.test.js`

**Interfaces:**
- Produces: an auth surface with no OTP symbols, routes, schemas, storage keys, or styles.

- [ ] **Step 1: Add a static regression assertion for forbidden OTP surface area**

Add `backend/tests/otp-removal.test.js` that reads the auth router and Swagger source and asserts none of these strings remain:

```js
const fs = require('fs');
const path = require('path');

it('contains no public OTP auth routes or Swagger contracts', () => {
  const files = ['src/routes/authRoutes.js', 'src/config/swagger.js'];
  const source = files.map((file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
  expect(source).not.toMatch(/request-otp|verify-otp|forgot-password|OtpVerification|PasswordResetOtp/i);
});
```

- [ ] **Step 2: Run the static regression test and verify red**

Run: `cd backend; npx jest tests/otp-removal.test.js --runInBand`

Expected: FAIL because Swagger still documents OTP contracts.

- [ ] **Step 3: Remove obsolete OTP implementation and references**

Delete the three backend OTP implementation files and their service test. Remove OTP schemas and paths from Swagger; document `/auth/register` as direct creation with response 201. Remove `VerificationCode` imports, cleanup, and mocks from seed and seed tests.

Delete `mockOtpRequests`, all mock OTP methods/helpers/reset cleanup, and the `.otp-input`/`.otp-channel-options` CSS blocks.

- [ ] **Step 4: Prove no active OTP references remain**

Run: `rg -n -i "otp|forgot-password|VerificationCode|requestRegistrationOtp|verifyRegistrationOtp|requestPasswordReset|resetPassword" frontend/src backend/src backend/tests --glob '!**/node_modules/**'`

Expected: no matches. The design/plan documentation is intentionally outside this search scope.

- [ ] **Step 5: Run complete verification**

Run: `cd backend; npm test`

Expected: Jest exits 0 with all suites and tests passing.

Run: `cd frontend; npm run test:run`

Expected: Vitest exits 0 with all files and tests passing.

Run: `cd frontend; npm run lint`

Expected: ESLint exits 0 with no errors.

Run: `cd frontend; npm run build`

Expected: Vite exits 0 and writes the production bundle to `frontend/dist/`.

- [ ] **Step 6: Commit cleanup and verification tests**

```powershell
git add -- backend/src/config/swagger.js backend/src/seed/seed.js backend/tests/seed-startup.test.js backend/tests/otp-removal.test.js backend/src/models/VerificationCode.js backend/src/repositories/verificationCodeRepository.js backend/src/services/otpDeliveryService.js backend/tests/otp-delivery-service.test.js frontend/src/utils/constants.js frontend/src/assets/styles/main.css frontend/src/mock/mockDb.js
git commit -m "chore: remove obsolete OTP implementation"
```

### Task 5: Final Diff Audit

**Files:**
- Review only: all files changed by Tasks 1-4.

**Interfaces:**
- Consumes: the complete implementation and verification output.
- Produces: a clean handoff with no unrelated user changes committed.

- [ ] **Step 1: Review commits and working tree**

Run: `git status --short`

Run: `git log -5 --oneline`

Run: `git diff HEAD~4 --check`

Expected: only the planned implementation files are present in the four feature commits; pre-existing user changes remain uncommitted and untouched; diff check prints no errors.

- [ ] **Step 2: Recheck acceptance criteria against source and tests**

Confirm direct registration, absent OTP surface, new mock credential migration, new seed credentials, unchanged customer credentials, and unchanged authenticated password-change route each have a passing test or direct source evidence.

