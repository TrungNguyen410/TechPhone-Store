# TechPhone Project Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the verified production blockers, business-logic abuse paths, privacy leaks, data-integrity defects, storefront contract mismatches, and missing release gates found by the 2026-08-05 whole-project audit.

**Architecture:** Keep the existing `routes -> controllers -> services -> repositories -> models` boundary. Make authenticated checkout the canonical behavior because the current cart UI and README already require login; enforce that boundary in the API instead of retaining an unreachable guest path. Move public/admin catalog behavior into explicit service methods, keep payment transitions server-owned, and use repository-backed atomic operations for shared rate limits and data migrations.

**Tech Stack:** Node.js 22, Express 5, MongoDB/Mongoose transactions, Jest/Supertest, React 19, React Router, Vite/Vitest, Docker Compose, GitHub Actions.

## Global Constraints

- Preserve server-authoritative pricing, voucher reservation, inventory decrement, idempotency, and MongoDB transaction behavior.
- Do not accept `card` orders through `POST /api/orders`; VNPay card orders must originate from `POST /api/payments/vnpay/checkout`.
- Checkout requires an authenticated active user in both frontend and backend.
- Public catalog endpoints expose only active records; `/api/admin/*` remains the only all-status catalog surface.
- Never log OTP values, SMS credentials, refresh tokens, full phone numbers, or VNPay secrets.
- Every public write endpoint must use an explicit DTO allowlist and a bounded request shape.
- Every task must leave backend tests green and must add frontend tests to CI before the final release gate.
- Preserve the user's untracked `docs/deployment/` files until their Render-versus-Vercel target is explicitly reconciled in Task 10.

---

## File Structure

- `backend/src/middlewares/rateLimit.js`: thin middleware adapter; no process-local source of truth.
- `backend/src/repositories/rateLimitRepository.js`: atomic MongoDB bucket consumption.
- `backend/src/models/RateLimitBucket.js`: TTL-backed shared rate-limit buckets.
- `backend/src/services/otpDeliveryService.js`: channel orchestration only.
- `backend/src/services/smsProviders/twilioProvider.js`: Twilio HTTP adapter with timeout and safe errors.
- `backend/src/services/orderService.js`: order rules, canonical customer data, payment-method boundaries.
- `backend/src/services/catalogService.js`: explicit public/admin catalog reads.
- `backend/src/services/paymentService.js`: VNPay and manual-payment state transitions.
- `backend/src/repositories/*Repository.js`: all Mongoose access, including inventory, analytics, and reference checks.
- `frontend/src/context/AuthContext.jsx`: session lifecycle and best-effort wishlist synchronization.
- `frontend/src/pages/{Account,Cart,Checkout,OrderSuccess}.jsx`: UI behavior aligned with backend rules.
- `backend/src/scripts/migrateSoftDeleteIndexes.js`: repeatable index migration.
- `.github/workflows/ci.yml`: complete frontend and backend release gate.

---

### Task 1: Close the unauthenticated and direct-card inventory exhaustion path (P0)

**Files:**
- Modify: `backend/src/routes/orderRoutes.js`
- Modify: `backend/src/routes/paymentRoutes.js`
- Modify: `backend/src/validators/orderValidators.js`
- Modify: `backend/src/services/orderService.js`
- Modify: `frontend/src/routes/AppRoutes.jsx`
- Modify: `frontend/src/pages/Cart.jsx`
- Test: `backend/tests/order-dashboard.test.js`
- Test: `backend/tests/payment.test.js`
- Test: `frontend/src/routes/AppRoutes.test.jsx`

**Interfaces:**
- Consumes: `protect`, `orderService.create(payload, user, metadata)`, and the existing VNPay checkout service.
- Produces: `orderValidators.createDirect`, `orderValidators.createVnpay`, and an authenticated-only checkout contract.

- [ ] **Step 1: Add failing API tests for the verified exploit and request bounds**

```js
it('rejects unauthenticated order creation without decrementing stock', async () => {
  const product = await seedProduct({ _id: 'protected-stock', stock: 2 });
  const response = await request(app).post('/api/orders').send(orderPayload(product.id));
  expect(response.status).toBe(401);
  expect((await Product.findById(product.id)).stock).toBe(2);
});

it('rejects card orders outside the VNPay checkout endpoint', async () => {
  const token = await loginCustomer();
  const product = await seedProduct({ _id: 'direct-card', stock: 2 });
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...orderPayload(product.id), paymentMethod: 'card' });
  expect(response.status).toBe(422);
  expect((await Product.findById(product.id)).stock).toBe(2);
});

it('rejects more than 50 line items', async () => {
  const token = await loginCustomer();
  const response = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...orderPayload('product-1'), items: Array.from({ length: 51 }, () => ({ productId: 'product-1', quantity: 1 })) });
  expect(response.status).toBe(422);
});
```

- [ ] **Step 2: Run the focused backend tests and verify they fail**

Run: `cd backend && npx jest tests/order-dashboard.test.js tests/payment.test.js --runInBand`

Expected: FAIL because `/api/orders` currently accepts guests and `paymentMethod: card`, and the item array has no maximum.

- [ ] **Step 3: Split direct-order and VNPay validation, and enforce authentication**

```js
// backend/src/validators/orderValidators.js
const MAX_ORDER_ITEMS = 50;
const commonCreate = [
  body('items').isArray({ min: 1, max: MAX_ORDER_ITEMS })
    .withMessage(`Đơn hàng phải có từ 1 đến ${MAX_ORDER_ITEMS} dòng sản phẩm`),
  body('items.*.type').isIn(['product', 'accessory']),
  body('items.*.quantity').isInt({ min: 1, max: 20 }),
  body('customer.fullName').trim().notEmpty().isLength({ max: 120 }),
  body('customer.email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('customer.phone').trim().custom((value) => Boolean(normalizeVietnamesePhone(value))),
  body('customer.address').trim().notEmpty().isLength({ max: 255 }),
  body('customer.province').trim().notEmpty().isLength({ max: 100 }),
  body('customer.district').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('customer.ward').trim().notEmpty().isLength({ max: 100 }),
  body('voucherCode').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
];
const createDirect = [
  ...commonCreate,
  body('paymentMethod').optional().isIn(['cod', 'bank', 'momo'])
    .withMessage('Đơn thẻ phải được tạo qua cổng VNPay'),
];
const createVnpay = [
  ...commonCreate,
  body('paymentMethod').optional().isIn(['card'])
    .withMessage('Phương thức thanh toán VNPay không hợp lệ'),
];
module.exports = { createDirect, createVnpay, update, updateStatus, lookup };
```

```js
// backend/src/routes/orderRoutes.js
router.post('/', protect, validators.createDirect, validate, orderController.create);
```

```js
// backend/src/routes/paymentRoutes.js
router.post('/vnpay/checkout', protect, orderValidators.createVnpay, validate, paymentController.createVnpayCheckout);
```

- [ ] **Step 4: Reject duplicates or aggregate them before querying inventory**

```js
// backend/src/services/orderService.js
normalizeRequestedItems(items = []) {
  const grouped = new Map();
  for (const item of items) {
    const type = item.type === 'accessory' || item.accessoryId ? 'accessory' : 'product';
    const id = String(type === 'accessory' ? item.accessoryId || item.productId || item.id : item.productId || item.id);
    const key = `${type}:${id}`;
    grouped.set(key, { type, id, quantity: (grouped.get(key)?.quantity || 0) + Number(item.quantity) });
  }
  return [...grouped.values()];
}
```

Call `normalizeRequestedItems()` before catalog lookups so the 50-line limit cannot multiply work or bypass aggregate stock checks.

- [ ] **Step 5: Protect the frontend checkout route**

```jsx
// frontend/src/routes/AppRoutes.jsx
<Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
```

Keep the existing cart login redirect and add a route test that an unauthenticated deep link to `/checkout` redirects to `/login`.

- [ ] **Step 6: Run focused tests**

Run: `cd backend && npx jest tests/order-dashboard.test.js tests/payment.test.js --runInBand`

Expected: PASS; unauthenticated/direct-card requests leave stock unchanged, while authenticated COD and VNPay flows remain green.

Run: `cd frontend && npm run test:run -- src/routes/AppRoutes.test.jsx`

Expected: PASS after dependencies are restored with `npm ci`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/orderRoutes.js backend/src/routes/paymentRoutes.js backend/src/validators/orderValidators.js backend/src/services/orderService.js backend/tests/order-dashboard.test.js backend/tests/payment.test.js frontend/src/routes/AppRoutes.jsx frontend/src/routes/AppRoutes.test.jsx
git commit -m "fix: enforce authenticated bounded checkout"
```

### Task 2: Add a production SMS provider and safe configuration (P0)

**Files:**
- Create: `backend/src/services/smsProviders/twilioProvider.js`
- Create: `backend/tests/twilio-sms-provider.test.js`
- Modify: `backend/src/services/otpDeliveryService.js`
- Modify: `backend/src/config/env.js`
- Modify: `backend/.env.example`
- Modify: `docs/otp-configuration.md`
- Test: `backend/tests/otp-delivery-service.test.js`

**Interfaces:**
- Consumes: normalized Vietnamese phone numbers in `0xxxxxxxxx` form.
- Produces: `twilioProvider.send({ to, body }) -> Promise<{ trackingId }>` and `otpDeliveryService.send(channel, target, code, purpose)`.

- [ ] **Step 1: Write failing adapter tests with a stubbed fetch**

```js
it('sends Vietnamese numbers in E.164 form without exposing the OTP in logs', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ sid: 'SM123' }),
  });
  const provider = new TwilioProvider({
    accountSid: 'AC123', authToken: 'secret', from: '+15005550006', fetchImpl,
  });
  await expect(provider.send({ to: '0912345678', body: 'Ma xac minh TechPhone: 123456' }))
    .resolves.toEqual({ trackingId: 'SM123' });
  expect(fetchImpl.mock.calls[0][1].body.toString()).toContain('To=%2B84912345678');
});

it('maps timeout and provider failures to a safe 503 error', async () => {
  const provider = new TwilioProvider({
    accountSid: 'AC123', authToken: 'secret', from: '+15005550006',
    fetchImpl: jest.fn().mockRejectedValue(new Error('socket timeout')),
  });
  await expect(provider.send({ to: '0912345678', body: 'secret body' }))
    .rejects.toMatchObject({ statusCode: 503 });
});
```

- [ ] **Step 2: Run tests and verify the missing adapter failure**

Run: `cd backend && npx jest tests/twilio-sms-provider.test.js tests/otp-delivery-service.test.js --runInBand`

Expected: FAIL because `TwilioProvider` does not exist and production always returns 503.

- [ ] **Step 3: Implement the adapter with timeout and Basic authentication**

```js
// backend/src/services/smsProviders/twilioProvider.js
const AppError = require('../../utils/AppError');

const toE164 = (phone) => `+84${String(phone).replace(/^0/, '')}`;

class TwilioProvider {
  constructor({ accountSid, authToken, from, fetchImpl = fetch }) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.from = from;
    this.fetchImpl = fetchImpl;
  }

  async send({ to, body }) {
    const form = new URLSearchParams({ To: toE164(to), From: this.from, Body: body });
    try {
      const response = await this.fetchImpl(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form,
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error(`SMS provider status ${response.status}`);
      const result = await response.json();
      return { trackingId: result.sid || null };
    } catch {
      throw new AppError('Không thể gửi SMS xác minh. Vui lòng thử lại sau.', 503);
    }
  }
}

module.exports = { TwilioProvider, toE164 };
```

Reference: `https://www.twilio.com/docs/messaging/api/message-resource`.

- [ ] **Step 4: Validate production configuration and wire the provider**

```js
// backend/src/config/env.js
sms: {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  from: process.env.TWILIO_FROM || '',
},
```

```js
// backend/src/services/otpDeliveryService.js
const { TwilioProvider } = require('./smsProviders/twilioProvider');

const createSmsProvider = (config) => {
  const values = [config.sms.accountSid, config.sms.authToken, config.sms.from];
  if (values.every(Boolean)) return new TwilioProvider(config.sms);
  if (config.nodeEnv === 'production') throw new AppError('Dịch vụ SMS chưa được cấu hình.', 503);
  return null;
};
```

The development path remains a debug delivery; production calls the provider and still never returns `debugOtp`.

- [ ] **Step 5: Document empty example variables without committing credentials**

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
```

- [ ] **Step 6: Run auth/provider tests**

Run: `cd backend && npx jest tests/auth.test.js tests/otp-delivery-service.test.js tests/twilio-sms-provider.test.js --runInBand`

Expected: PASS, including production configured, production unconfigured, timeout, and debug-mode cases.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/smsProviders/twilioProvider.js backend/src/services/otpDeliveryService.js backend/src/config/env.js backend/.env.example backend/tests/twilio-sms-provider.test.js backend/tests/otp-delivery-service.test.js docs/otp-configuration.md
git commit -m "feat: deliver production OTP through configured SMS provider"
```

### Task 3: Canonicalize order phones and protect public order lookup (P1)

**Files:**
- Create: `backend/src/models/RateLimitBucket.js`
- Create: `backend/src/repositories/rateLimitRepository.js`
- Modify: `backend/src/middlewares/rateLimit.js`
- Modify: `backend/src/routes/orderRoutes.js`
- Modify: `backend/src/services/orderService.js`
- Modify: `backend/src/repositories/orderRepository.js`
- Modify: `frontend/src/pages/OrderLookup.jsx`
- Test: `backend/tests/order-dashboard.test.js`

**Interfaces:**
- Consumes: `normalizeVietnamesePhone(value)`.
- Produces: canonical phone storage, shared `consumeRateLimit({key, windowMs, max})`, and a masked public lookup DTO.

- [ ] **Step 1: Add failing normalization, privacy, and throttling tests**

```js
it('looks up an order with the canonical equivalent of its checkout phone', async () => {
  const order = await createOrder({ customer: { ...customer, phone: '0912 345 678' } });
  const response = await request(app).get(`/api/orders/lookup?orderNumber=${order.orderNumber}&phone=0912345678`);
  expect(response.status).toBe(200);
  expect(response.body.data.customer.phone).toBe('091****678');
  expect(response.body.data.customer.address).toBeUndefined();
});

it('rate limits repeated public lookup failures', async () => {
  for (let index = 0; index < 10; index += 1) {
    await request(app).get('/api/orders/lookup?orderNumber=TP2601019999&phone=0912345678');
  }
  const blocked = await request(app).get('/api/orders/lookup?orderNumber=TP2601019999&phone=0912345678');
  expect(blocked.status).toBe(429);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `cd backend && npx jest tests/order-dashboard.test.js --runInBand`

Expected: FAIL because phone equality is exact, the full order is returned, and lookup has no limiter.

- [ ] **Step 3: Normalize before fingerprinting, storage, and lookup**

```js
// backend/src/services/orderService.js
const { normalizeVietnamesePhone } = require('../utils/phone');

canonicalCustomer(customer = {}) {
  const phone = normalizeVietnamesePhone(customer.phone);
  if (!phone) throw new AppError('Số điện thoại người nhận không hợp lệ', 422);
  return { ...customer, phone };
}
```

Use the canonical customer in `buildRequestFingerprint`, `buildIdempotencyKey`, shipping calculation, and `orderRepository.create`. Normalize the lookup phone before repository access.

- [ ] **Step 4: Return a masked lookup DTO**

```js
// backend/src/services/orderService.js
publicLookup(order) {
  const phone = order.customer.phone;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    items: order.items.map(({ id, name, image, price, quantity, type }) => ({ id, name, image, price, quantity, type })),
    total: order.total,
    shippingProvider: order.shippingProvider,
    trackingNumber: order.trackingNumber,
    estimatedDelivery: order.estimatedDelivery,
    customer: {
      fullName: `${order.customer.fullName.slice(0, 1)}***`,
      phone: `${phone.slice(0, 3)}****${phone.slice(-3)}`,
    },
  };
}
```

Update `OrderLookup.jsx` so it does not require or render `customer.address`.

- [ ] **Step 5: Replace the process-local limiter with an atomic MongoDB bucket**

```js
// backend/src/models/RateLimitBucket.js
const schema = new mongoose.Schema({
  _id: String,
  count: { type: Number, required: true },
  resetAt: { type: Date, required: true, index: { expires: 0 } },
}, { versionKey: false });
module.exports = mongoose.model('RateLimitBucket', schema);
```

```js
// backend/src/repositories/rateLimitRepository.js
async function consume({ key, windowMs, max, now = new Date() }) {
  const resetAt = new Date(now.getTime() + windowMs);
  const bucket = await RateLimitBucket.findOneAndUpdate(
    { _id: key, $or: [{ resetAt: { $lte: now } }, { count: { $lt: max } }] },
    [{ $set: { count: { $cond: [{ $lte: ['$resetAt', now] }, 1, { $add: ['$count', 1] }] }, resetAt: { $cond: [{ $lte: ['$resetAt', now] }, resetAt, '$resetAt'] } } }],
    { upsert: true, returnDocument: 'after' },
  );
  return { allowed: bucket.count <= max, resetAt: bucket.resetAt };
}
```

Hash phone/order lookup identities before using them as `_id`; never store raw PII in rate-limit keys. Configure `app.set('trust proxy', 1)` only for the selected one-hop deployment topology.

- [ ] **Step 6: Run tests**

Run: `cd backend && npx jest tests/order-dashboard.test.js tests/auth.test.js --runInBand`

Expected: PASS with canonical phone matching, masked output, and a 429 after the configured limit.

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/RateLimitBucket.js backend/src/repositories/rateLimitRepository.js backend/src/middlewares/rateLimit.js backend/src/routes/orderRoutes.js backend/src/services/orderService.js backend/src/repositories/orderRepository.js backend/tests/order-dashboard.test.js frontend/src/pages/OrderLookup.jsx
git commit -m "fix: normalize phones and protect order lookup"
```

### Task 4: Separate public catalog visibility and protect taxonomy references (P1)

**Files:**
- Modify: `backend/src/services/catalogService.js`
- Modify: `backend/src/controllers/crudController.js`
- Modify: `backend/src/routes/productRoutes.js`
- Modify: `backend/src/routes/accessoryRoutes.js`
- Modify: `backend/src/services/taxonomyService.js`
- Modify: `backend/src/repositories/productRepository.js`
- Modify: `backend/src/repositories/accessoryRepository.js`
- Test: `backend/tests/catalog.test.js`

**Interfaces:**
- Produces: `catalogService.listPublic(query)`, `catalogService.getPublicById(id)`, and `taxonomyService.remove(id)` that rejects referenced taxonomy.

- [ ] **Step 1: Add failing visibility and reference-integrity tests**

```js
it('never returns inactive catalog records from public endpoints', async () => {
  await Product.create({ ...validProduct, _id: 'hidden-product', status: 'inactive' });
  expect((await request(app).get('/api/products?status=inactive')).body.data).toEqual([]);
  expect((await request(app).get('/api/products/hidden-product')).status).toBe(404);
});

it('refuses to delete a taxonomy referenced by active catalog items', async () => {
  const token = await loginAdmin();
  const response = await request(app)
    .delete(`/api/admin/categories/${category.id}`)
    .set('Authorization', `Bearer ${token}`);
  expect(response.status).toBe(409);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `cd backend && npx jest tests/catalog.test.js --runInBand`

Expected: FAIL because public services accept inactive status and taxonomy deletion is generic.

- [ ] **Step 3: Implement explicit public methods**

```js
async listPublic(query = {}) {
  return this.list({ ...query, status: 'active' });
}

async getPublicById(id) {
  const item = await this.repository.findOne({ _id: id, status: 'active' });
  if (!item) throw new AppError('Không tìm thấy dữ liệu yêu cầu', 404);
  return this.denormalize(item);
}
```

Add a repository `findOne(filter)` method that always appends `isDeleted: false`. Wire public routes to public controller actions; keep admin routes on existing `list/getById`.

- [ ] **Step 4: Guard taxonomy deletion through repositories**

```js
async remove(id) {
  const references = await Promise.all([
    this.productRepository.count({ $or: [{ brandId: id }, { categoryId: id }] }),
    this.accessoryRepository.count({ $or: [{ brandId: id }, { categoryId: id }] }),
  ]);
  if (references.some((count) => count > 0)) {
    throw new AppError('Không thể xóa taxonomy đang được sản phẩm sử dụng', 409);
  }
  return this.repository.softDelete(id);
}
```

Inject product/accessory repositories into taxonomy services in `backend/src/services/index.js`; do not import Mongoose models from the service.

- [ ] **Step 5: Run catalog tests**

Run: `cd backend && npx jest tests/catalog.test.js tests/seo.test.js --runInBand`

Expected: PASS; admin still sees inactive items, public endpoints do not, and referenced taxonomy deletion returns 409.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/catalogService.js backend/src/controllers/crudController.js backend/src/routes/productRoutes.js backend/src/routes/accessoryRoutes.js backend/src/services/taxonomyService.js backend/src/repositories/productRepository.js backend/src/repositories/accessoryRepository.js backend/src/services/index.js backend/tests/catalog.test.js
git commit -m "fix: enforce public catalog visibility and taxonomy integrity"
```

### Task 5: Remove mass assignment and validate review targets (P1)

**Files:**
- Create: `backend/src/utils/pick.js`
- Modify: `backend/src/services/baseCrudService.js`
- Modify: `backend/src/services/customerService.js`
- Modify: `backend/src/services/reviewService.js`
- Modify: `backend/src/validators/reviewValidators.js`
- Modify: `backend/src/controllers/crudController.js`
- Test: `backend/tests/contact.test.js`
- Test: `backend/tests/voucher-review.test.js`

**Interfaces:**
- Produces: explicit `pick(payload, fields)` DTO mapping and review target XOR/existence validation.

- [ ] **Step 1: Add failing mass-assignment and orphan-review tests**

```js
it('ignores server-owned fields on public contact creation', async () => {
  const response = await request(app).post('/api/contacts').send({
    fullName: 'Audit User', email: 'audit@example.com', phone: '0912345678',
    subject: 'Audit message', message: 'A valid contact message',
    status: 'resolved', adminNote: 'forged', isDeleted: true,
  });
  expect(response.status).toBe(201);
  expect(response.body.data).toMatchObject({ status: 'new', adminNote: '', isDeleted: false });
});

it('requires exactly one existing active review target', async () => {
  const token = await loginCustomer();
  const both = await request(app).post('/api/reviews').set('Authorization', `Bearer ${token}`).send({
    productId: 'product-1', accessoryId: 'accessory-1', rating: 5, comment: 'Long enough review',
  });
  const missing = await request(app).post('/api/reviews').set('Authorization', `Bearer ${token}`).send({
    productId: 'missing-product', rating: 5, comment: 'Long enough review',
  });
  expect(both.status).toBe(422);
  expect(missing.status).toBe(404);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `cd backend && npx jest tests/contact.test.js tests/voucher-review.test.js --runInBand`

Expected: FAIL because raw payload fields are persisted and review targets are not verified.

- [ ] **Step 3: Add and use a DTO picker**

```js
// backend/src/utils/pick.js
module.exports = (payload, fields) => Object.fromEntries(
  fields.filter((field) => Object.hasOwn(payload || {}, field)).map((field) => [field, payload[field]]),
);
```

```js
// Contact create mapping
const contact = pick(req.body, ['fullName', 'email', 'phone', 'subject', 'message']);
return service.create({ ...contact, status: 'new', adminNote: '' });
```

Define these controller-owned allowlists and pass only the selected DTO to each service; reject an empty update DTO with 422:

```js
const mutationFields = {
  customerUpdate: ['fullName', 'email', 'phone', 'address', 'province', 'district', 'ward', 'role', 'status'],
  settingUpdate: ['value', 'description', 'isPublic'],
  bannerCreate: ['title', 'subtitle', 'image', 'link', 'position', 'order', 'status'],
  bannerUpdate: ['title', 'subtitle', 'image', 'link', 'position', 'order', 'status'],
  taxonomyCreate: ['name', 'slug', 'description', 'image', 'status'],
  taxonomyUpdate: ['name', 'slug', 'description', 'image', 'status'],
  catalogCreate: ['name', 'slug', 'description', 'price', 'salePrice', 'stock', 'images', 'brand', 'category', 'specifications', 'status'],
  catalogUpdate: ['name', 'slug', 'description', 'price', 'salePrice', 'stock', 'images', 'brand', 'category', 'specifications', 'status'],
  reviewAdminUpdate: ['status', 'adminReply'],
};
```

- [ ] **Step 4: Enforce review target XOR and existence**

```js
body().custom((payload) => {
  if (Boolean(payload.productId) === Boolean(payload.accessoryId)) {
    throw new Error('Đánh giá phải thuộc đúng một sản phẩm hoặc phụ kiện');
  }
  return true;
});
```

In `reviewService.create`, select and validate the concrete target before calculating `verifiedPurchase`:

```js
const target = accessoryId
  ? await accessoryRepository.findById(accessoryId)
  : await productRepository.findById(productId);
if (!target || target.isDeleted || target.status !== 'active') {
  throw new NotFoundError('Sản phẩm đánh giá không tồn tại');
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && npx jest tests/contact.test.js tests/voucher-review.test.js --runInBand`

Expected: PASS with server-owned fields protected and invalid review targets rejected.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/pick.js backend/src/services/baseCrudService.js backend/src/services/customerService.js backend/src/services/reviewService.js backend/src/validators/reviewValidators.js backend/src/controllers/crudController.js backend/tests/contact.test.js backend/tests/voucher-review.test.js
git commit -m "fix: enforce API mutation allowlists"
```

### Task 6: Add bank and MoMo reconciliation with an audit trail (P1)

**Files:**
- Modify: `backend/src/models/Order.js`
- Modify: `backend/src/services/paymentService.js`
- Modify: `backend/src/controllers/paymentController.js`
- Modify: `backend/src/routes/adminRoutes.js`
- Modify: `backend/src/validators/orderValidators.js`
- Modify: `frontend/src/api/paymentApi.js`
- Modify: `frontend/src/pages/admin/OrderManagement.jsx`
- Test: `backend/tests/payment.test.js`
- Test: `frontend/src/pages/admin/OrderManagement.test.jsx`

**Interfaces:**
- Produces: `PUT /api/admin/orders/:id/payment` with `{status: 'paid'|'failed', reference, note}` and actor/timestamp audit fields.

- [ ] **Step 1: Add failing transition tests**

```js
it('lets an admin reconcile a manual payment once and records the actor', async () => {
  const order = await seedOrder({ paymentMethod: 'bank', paymentStatus: 'pending' });
  const response = await request(app)
    .put(`/api/admin/orders/${order.id}/payment`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'paid', reference: 'BANK-20260805-01', note: 'Matched bank statement' });
  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({ paymentStatus: 'paid', paymentReference: 'BANK-20260805-01' });
  expect(response.body.data.paymentAudit.confirmedBy).toBe(admin.id);
});
```

- [ ] **Step 2: Run focused tests and verify 404/failure**

Run: `cd backend && npx jest tests/payment.test.js --runInBand`

Expected: FAIL because the reconciliation endpoint and audit fields do not exist.

- [ ] **Step 3: Add schema fields and guarded transition**

```js
paymentAudit: {
  confirmedBy: { type: String, ref: 'User', default: null },
  confirmedAt: { type: Date, default: null },
  note: { type: String, default: '' },
},
```

```js
async reconcileManualPayment(orderId, payload, actor) {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new AppError('Không tìm thấy đơn hàng', 404);
  if (!['bank', 'momo'].includes(order.paymentMethod)) throw new AppError('Đơn hàng không dùng thanh toán thủ công', 409);
  if (!['pending', 'failed'].includes(order.paymentStatus)) throw new AppError('Thanh toán đã được đối soát', 409);
  return orderRepository.updateState(
    orderId,
    { paymentStatus: { $in: ['pending', 'failed'] } },
    {
      paymentStatus: payload.status,
      paymentReference: payload.reference,
      paymentAudit: { confirmedBy: actor.id, confirmedAt: new Date(), note: payload.note || '' },
      ...(payload.status === 'paid' && order.status === 'pending' ? { status: 'confirmed' } : {}),
    },
  );
}
```

- [ ] **Step 4: Add admin UI actions and tests**

Render reconcile controls only for `bank`/`momo` orders in `pending` or `failed` payment state. Require a reference before confirming `paid`; display actor, time, and note read-only after reconciliation.

- [ ] **Step 5: Run backend and frontend tests**

Run: `cd backend && npx jest tests/payment.test.js tests/order-dashboard.test.js --runInBand`

Run: `cd frontend && npm run test:run -- src/pages/admin/OrderManagement.test.jsx`

Expected: PASS with valid/invalid/double reconciliation cases covered.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Order.js backend/src/services/paymentService.js backend/src/controllers/paymentController.js backend/src/routes/adminRoutes.js backend/src/validators/orderValidators.js backend/tests/payment.test.js frontend/src/api/paymentApi.js frontend/src/pages/admin/OrderManagement.jsx frontend/src/pages/admin/OrderManagement.test.jsx
git commit -m "feat: reconcile manual payments with audit trail"
```

### Task 7: Repair frontend session, cancellation, and pricing behavior (P1)

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/context/AuthContext.test.jsx`
- Modify: `frontend/src/pages/Account.jsx`
- Modify: `frontend/src/pages/Account.test.jsx`
- Modify: `frontend/src/components/cart/CartSummary.jsx`
- Modify: `frontend/src/pages/Cart.jsx`
- Modify: `frontend/src/pages/Checkout.jsx`
- Test: `frontend/src/pages/Checkout.test.jsx`

**Interfaces:**
- Produces: login success independent of wishlist network availability, safe cancel feedback, and explicitly estimated cart shipping.

- [ ] **Step 1: Add failing tests**

```jsx
it('keeps a successful login when remote wishlist sync fails', async () => {
  authApiMock.login.mockResolvedValue(session);
  authApiMock.updateWishlist.mockRejectedValue(new Error('offline'));
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByText(session.user.phone)).toBeInTheDocument();
  expect(storage.get(STORAGE_KEYS.token)).toBe(session.token);
});

it('does not offer self-cancel for a paid confirmed order', async () => {
  orderApi.getMyOrders.mockResolvedValue([{ ...order, status: 'confirmed', paymentStatus: 'paid' }]);
  renderAccount();
  expect(await screen.findByText(order.orderNumber)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Hủy đơn/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run frontend tests and verify failure**

Run: `cd frontend && npm run test:run -- src/context/AuthContext.test.jsx src/pages/Account.test.jsx src/pages/Checkout.test.jsx`

Expected: FAIL after `npm ci` because wishlist rejection bubbles and paid confirmed orders expose the cancel action.

- [ ] **Step 3: Make wishlist synchronization best-effort**

```js
const mergeLocalWishlist = useCallback(async (session) => {
  const localItems = storage.get(STORAGE_KEYS.wishlist, []);
  const remoteItems = session.user.wishlist || [];
  const mergedItems = mergeWishlists(remoteItems, localItems);
  try {
    const wishlist = wishlistEquals(mergedItems, remoteItems)
      ? remoteItems
      : await authApi.updateWishlist(session.user.id, mergedItems);
    const nextSession = { ...session, user: { ...session.user, wishlist } };
    setUser(nextSession.user);
    storage.set(STORAGE_KEYS.currentUser, nextSession.user);
    storage.set(STORAGE_KEYS.wishlist, wishlist);
    window.dispatchEvent(new CustomEvent('wishlist-updated'));
    return nextSession;
  } catch {
    storage.set(STORAGE_KEYS.wishlist, mergedItems);
    return session;
  }
}, []);
```

Persist the authenticated session before sync, return the base session on sync failure, and retry wishlist synchronization on the next successful `loadCurrentUser`.

- [ ] **Step 4: Guard and handle cancellation**

```jsx
const canSelfCancel = (order) =>
  ['pending', 'confirmed'].includes(order.status)
  && !['paid', 'refund_required', 'refunded'].includes(order.paymentStatus);

const cancelOrder = async () => {
  try {
    await orderApi.cancel(cancelOrderId);
    setCancelOrderId(null);
    await loadOrders();
    toast.success('Đã hủy đơn hàng');
  } catch (error) {
    toast.error(error.friendlyMessage || error.message);
  }
};
```

- [ ] **Step 5: Stop presenting a false exact shipping total in the cart**

```jsx
// frontend/src/components/cart/CartSummary.jsx
<div><span>Phí vận chuyển</span><strong>Tính theo tỉnh/thành ở bước thanh toán</strong></div>
<div className="summary-total"><span>Tạm tính sau giảm giá</span><strong>{formatCurrency(subtotal - discount)}</strong></div>
```

Keep checkout and backend shipping formulas aligned through existing `shipping.test.js`; do not use the cart's hard-coded `30000` as a final total.

- [ ] **Step 6: Run frontend tests**

Run: `cd frontend && npm run test:run -- src/context/AuthContext.test.jsx src/pages/Account.test.jsx src/pages/Checkout.test.jsx src/utils/shipping.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/context/AuthContext.jsx frontend/src/context/AuthContext.test.jsx frontend/src/pages/Account.jsx frontend/src/pages/Account.test.jsx frontend/src/components/cart/CartSummary.jsx frontend/src/pages/Cart.jsx frontend/src/pages/Checkout.jsx frontend/src/pages/Checkout.test.jsx
git commit -m "fix: align storefront session order and pricing states"
```

### Task 8: Make soft-delete uniqueness reusable and migration-safe (P1)

**Files:**
- Create: `backend/src/scripts/migrateSoftDeleteIndexes.js`
- Create: `backend/tests/soft-delete-indexes.test.js`
- Modify: `backend/src/models/Brand.js`
- Modify: `backend/src/models/Category.js`
- Modify: `backend/src/models/Voucher.js`
- Modify: `backend/src/models/Setting.js`
- Modify: `backend/src/models/User.js`
- Modify: `backend/package.json`

**Interfaces:**
- Produces: partial unique indexes scoped to `{isDeleted: false}` and a repeatable `npm run migrate:soft-delete-indexes` command.

- [ ] **Step 1: Add failing recreation tests**

```js
it.each([
  [Brand, { name: 'Apple', slug: 'apple' }, 'slug'],
  [Category, { name: 'Phone', slug: 'phone' }, 'slug'],
  [Voucher, voucherPayload('REUSE10'), 'code'],
  [Setting, { key: 'hotline', value: '1900' }, 'key'],
])('allows recreating %s after soft delete', async (Model, payload) => {
  const original = await Model.create(payload);
  await original.softDelete();
  await expect(Model.create(payload)).resolves.toBeDefined();
});
```

- [ ] **Step 2: Run and verify duplicate-key failures**

Run: `cd backend && npx jest tests/soft-delete-indexes.test.js --runInBand`

Expected: FAIL with MongoDB duplicate key errors.

- [ ] **Step 3: Replace inline unique declarations with named partial indexes**

```js
brandSchema.index(
  { slug: 1 },
  { name: 'brand_slug_active_unique', unique: true, partialFilterExpression: { isDeleted: false } },
);
```

Declare every active-record unique index explicitly, then remove `unique: true` from the corresponding field declarations:

```js
categorySchema.index({ slug: 1 }, { name: 'category_slug_active_unique', unique: true, partialFilterExpression: { isDeleted: false } });
voucherSchema.index({ code: 1 }, { name: 'voucher_code_active_unique', unique: true, partialFilterExpression: { isDeleted: false } });
settingSchema.index({ key: 1 }, { name: 'setting_key_active_unique', unique: true, partialFilterExpression: { isDeleted: false } });
userSchema.index({ phone: 1 }, { name: 'user_phone_active_unique', unique: true, partialFilterExpression: { isDeleted: false } });
userSchema.index(
  { email: 1 },
  { name: 'user_email_active_unique', unique: true, partialFilterExpression: { email: { $type: 'string' }, isDeleted: false } },
);
```

- [ ] **Step 4: Implement a repeatable index migration**

```js
const migrations = [
  { Model: Brand, drop: ['slug_1'], sync: true },
  { Model: Category, drop: ['slug_1'], sync: true },
  { Model: Voucher, drop: ['code_1'], sync: true },
  { Model: Setting, drop: ['key_1'], sync: true },
  { Model: User, drop: ['phone_1', 'email_optional_unique'], sync: true },
];

for (const { Model, drop } of migrations) {
  const existing = new Set((await Model.collection.indexes()).map((index) => index.name));
  for (const name of drop) if (existing.has(name)) await Model.collection.dropIndex(name);
  await Model.syncIndexes();
}
```

Add a dry-run mode that prints the exact index names and exits without mutation unless `--write` is supplied, matching the existing migration scripts.

- [ ] **Step 5: Run tests and migration dry-run**

Run: `cd backend && npx jest tests/soft-delete-indexes.test.js tests/catalog.test.js --runInBand`

Run: `cd backend && npm run migrate:soft-delete-indexes`

Expected: tests PASS; dry-run prints planned drops/creates and performs no writes.

- [ ] **Step 6: Commit**

```bash
git add backend/src/models/Brand.js backend/src/models/Category.js backend/src/models/Voucher.js backend/src/models/Setting.js backend/src/models/User.js backend/src/scripts/migrateSoftDeleteIndexes.js backend/tests/soft-delete-indexes.test.js backend/package.json
git commit -m "fix: scope unique indexes to active records"
```

### Task 9: Move analytics queries into repositories and make results date-aware (P2)

**Files:**
- Modify: `backend/src/repositories/orderRepository.js`
- Modify: `backend/src/repositories/productRepository.js`
- Modify: `backend/src/repositories/userRepository.js`
- Modify: `backend/src/services/dashboardService.js`
- Modify: `backend/src/services/customerService.js`
- Modify: `backend/src/controllers/adminController.js`
- Modify: `backend/src/routes/adminRoutes.js`
- Modify: `frontend/src/api/adminApi.js`
- Modify: `frontend/src/pages/admin/CustomerManagement.jsx`
- Modify: `frontend/src/pages/admin/OrderManagement.jsx`
- Test: `backend/tests/order-dashboard.test.js`

**Interfaces:**
- Produces: `dashboardService.statistics({year})` and paginated `customerService.list({page,limit})`.

- [ ] **Step 1: Add failing cross-year and pagination tests**

```js
it('does not merge the same month from different years', async () => {
  await seedCompletedOrder({ createdAt: new Date('2025-01-10'), total: 1000000 });
  await seedCompletedOrder({ createdAt: new Date('2026-01-10'), total: 2000000 });
  const response = await request(app)
    .get('/api/admin/dashboard?year=2026')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(response.body.data.monthlyRevenue[0]).toBe(2);
});
```

- [ ] **Step 2: Run and verify the January value is incorrectly combined**

Run: `cd backend && npx jest tests/order-dashboard.test.js --runInBand`

Expected: FAIL with January equal to `3` instead of `2` million VND.

- [ ] **Step 3: Add repository aggregations**

```js
async revenueByMonth(year) {
  return Order.aggregate([
    { $match: { isDeleted: false, status: { $in: ['delivered', 'completed'] }, createdAt: { $gte: new Date(`${year}-01-01T00:00:00.000Z`), $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) } } },
    { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$total' } } },
  ]);
}
```

Add repository methods for recent orders, status counts, top products, and customer order totals. Services must no longer import `Order`, `Product`, or `User` models directly.

- [ ] **Step 4: Paginate admin lists**

Return `{ items, pagination: { page, limit, total, totalPages } }` from customers and admin orders. Normalize both methods in `adminApi` to return that object, and update `CustomerManagement.jsx` and `OrderManagement.jsx` to render `response.items` and drive their pagers from `response.pagination`.

- [ ] **Step 5: Run backend tests**

Run: `cd backend && npx jest tests/order-dashboard.test.js --runInBand`

Expected: PASS for cross-year, empty-year, pagination, and existing dashboard cases.

- [ ] **Step 6: Commit**

```bash
git add backend/src/repositories/orderRepository.js backend/src/repositories/productRepository.js backend/src/repositories/userRepository.js backend/src/services/dashboardService.js backend/src/services/customerService.js backend/src/controllers/adminController.js backend/src/routes/adminRoutes.js backend/tests/order-dashboard.test.js frontend/src/api/adminApi.js frontend/src/pages/admin/CustomerManagement.jsx frontend/src/pages/admin/OrderManagement.jsx
git commit -m "refactor: aggregate paginated admin analytics"
```

### Task 10: Reconcile deployment configuration, durable uploads, SEO, and Swagger (P1)

**Files:**
- Modify: `backend/src/config/env.js`
- Modify: `backend/src/config/swagger.js`
- Modify: `backend/.env.example`
- Modify: `frontend/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `deployment.md`
- Modify: `README.md`
- Review without overwriting: `docs/deployment/2026-07-29-vercel-netlify-class-project-runbook.md`
- Review without overwriting: `docs/deployment/2026-08-01-deployment-otp-readiness-audit.md`
- Test: `backend/tests/swagger.test.js`
- Test: `frontend/src/utils/runtimeConfig.test.js`

**Interfaces:**
- Produces: one documented production target, required public URLs, non-localhost metadata, and an explicit durable-upload strategy.

- [ ] **Step 1: Choose the deployment target from existing project evidence**

Use Render for the canonical committed guide unless the owner explicitly selects the untracked Vercel draft. The current `deployment.md` and persistent local upload design already align more closely with a long-running service; do not silently merge Vercel serverless instructions into it.

- [ ] **Step 2: Add failing production URL tests**

```js
it('uses API_PUBLIC_URL in Swagger production servers', () => {
  process.env.API_PUBLIC_URL = 'https://api.techphone.example';
  jest.resetModules();
  const swagger = require('../src/config/swagger');
  expect(swagger.servers[0].url).toBe('https://api.techphone.example/api');
});
```

Test `createRuntimeConfig({PROD:true,VITE_USE_MOCK:'false',VITE_API_URL:'https://api.techphone.example/api',VITE_SITE_URL:''})` throws instead of emitting localhost canonical metadata.

- [ ] **Step 3: Require public URLs in production**

```js
const requiredUrl = (name, fallback) => {
  const value = process.env[name] || (isProduction ? '' : fallback);
  if (!value || !/^https?:\/\//.test(value)) throw new Error(`${name} phải là URL tuyệt đối`);
  return value.replace(/\/+$/, '');
};
```

Use it for `FRONTEND_URL`, `PUBLIC_SITE_URL`, `API_PUBLIC_URL`, and `VNPAY_RETURN_URL` when the related provider is enabled.

- [ ] **Step 4: Pass site URL through container builds**

```dockerfile
ARG VITE_SITE_URL=http://localhost:3000
ENV VITE_SITE_URL=$VITE_SITE_URL
```

```yaml
frontend:
  build:
    args:
      VITE_SITE_URL: http://localhost:3000
```

The production deployment guide must set `VITE_SITE_URL=https://shop.techphone.example`, `API_PUBLIC_URL=https://api.techphone.example`, and `VNPAY_RETURN_URL=https://api.techphone.example/api/payments/vnpay/return` with the real deployment domains.

- [ ] **Step 5: Make upload durability explicit**

For Render, provision and mount a persistent disk at `/app/uploads`; document that the service must set `UPLOAD_DIR=/app/uploads`. If the selected target is Vercel, disable local upload routes and require Cloudinary because function filesystems are not durable. Add a startup assertion so a serverless production target cannot advertise local uploads.

- [ ] **Step 6: Generate Swagger servers from env**

```js
servers: [{ url: `${env.apiPublicUrl}/api`, description: env.nodeEnv === 'production' ? 'Production' : 'Current environment' }],
```

- [ ] **Step 7: Run config tests and build metadata verification**

Run: `cd backend && npx jest tests/swagger.test.js tests/seo.test.js --runInBand`

Run: `cd frontend && VITE_SITE_URL=https://shop.techphone.example npm run build`

Expected: PASS; `dist/robots.txt`, `dist/sitemap.xml`, and `dist/index.html` contain `https://shop.techphone.example` and no `localhost`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/config/env.js backend/src/config/swagger.js backend/.env.example backend/tests/swagger.test.js frontend/Dockerfile frontend/src/utils/runtimeConfig.test.js docker-compose.yml deployment.md README.md
git commit -m "fix: make production URLs and storage explicit"
```

### Task 11: Restore deterministic frontend verification and complete CI gates (P1)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `frontend/package.json`
- Modify: `backend/package.json`
- Modify: `README.md`
- Optional test-infrastructure modification after reproduced timeout: `backend/tests/setup.js`

**Interfaces:**
- Produces: one Node engine contract and CI commands that execute every frontend test.

- [ ] **Step 1: Restore the local dependency tree from the lockfile**

Run: `cd frontend && npm ci`

Expected: `npm ls --depth=0` exits 0 with no unmet or extraneous dependencies. Do not edit `package-lock.json` during this restoration step.

- [ ] **Step 2: Run the previously blocked checks**

Run: `cd frontend && npm run lint && npm run test:run && npm run build`

Expected: all commands exit 0. Record any source failure as a new finding before changing code.

- [ ] **Step 3: Add the missing frontend test gate**

```yaml
- name: Run frontend tests
  run: npm run test:run

- name: Build frontend
  run: npm run build
```

Place the test step after lint and before build in `.github/workflows/ci.yml`.

- [ ] **Step 4: Pin the supported Node major consistently**

```json
"engines": {
  "node": ">=22 <23"
}
```

Use Node 22 in both package manifests, CI, Dockerfiles, and README. This matches the current CI runtime and avoids local/CI/container drift.

- [ ] **Step 5: Record the React Router advisory as non-applicable to the current SPA and schedule the compatible upgrade**

The current advisory `GHSA-qwww-vcr4-c8h2` only affects unstable RSC APIs, which this Vite SPA does not use. Add a short security exception with the exact package/version, reason, owner, and review date; create a separate compatibility change for React Router 8.3+ rather than applying `npm audit fix --force` or downgrading blindly.

- [ ] **Step 6: Reproduce and contain the observed MongoMemoryReplSet startup timeout**

Run the backend suite three times in a clean Node 22 environment with `npm test -- --runInBand`. When a setup timeout occurs in at least two runs, add this before the hooks in `backend/tests/setup.js`:

```js
jest.setTimeout(30000);
```

Do not alter database lifecycle after a single timeout. If two runs fail, record setup duration from all three runs; the 30-second setup bound is the scoped fix, while database isolation remains unchanged.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml frontend/package.json backend/package.json README.md backend/tests/setup.js
git commit -m "ci: run complete checks on one Node runtime"
```

### Task 12: Whole-project verification and final review

**Files:**
- Review: all files changed by Tasks 1-11.

**Interfaces:**
- Produces: a release evidence record with no skipped mandatory gate.

- [ ] **Step 1: Run backend coverage**

Run: `cd backend && npm run test:coverage`

Expected: 18 or more suites pass, all tests pass, and global coverage remains at least branches 65%, functions 70%, lines 85%, statements 80%.

- [ ] **Step 2: Run frontend checks**

Run: `cd frontend && npm run lint`

Run: `cd frontend && npm run test:run`

Run: `cd frontend && VITE_USE_MOCK=false VITE_API_URL=https://api.techphone.example/api VITE_SITE_URL=https://shop.techphone.example npm run build`

Expected: all commands exit 0 and the build contains no localhost production metadata.

- [ ] **Step 3: Run dependency and container checks**

Run: `cd backend && npm audit --omit=dev`

Expected: 0 production vulnerabilities.

Run: `cd frontend && npm audit --omit=dev`

Expected: no unreviewed production vulnerability; the documented RSC-only exception is still non-applicable or has been removed by the compatibility upgrade.

Run: `docker compose config --quiet && docker compose build`

Expected: both commands exit 0.

- [ ] **Step 4: Re-run the exploit regressions explicitly**

Verify unauthenticated/direct-card order creation cannot decrement inventory, public lookup is throttled and masked, inactive catalog items return 404, mass-assigned fields are ignored, soft-deleted unique values can be recreated, and manual payment reconciliation records its actor.

- [ ] **Step 5: Inspect the final diff and working tree**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors; only intentional tracked changes and the owner's pre-existing untracked `docs/deployment/` files are present.

- [ ] **Step 6: Request code review**

Use `.claude/skills/requesting-code-review` against the full remediation range. Resolve all Critical and Important feedback before release.

- [ ] **Step 7: Record the verification result**

Attach the exact command results to the pull request: backend suite and coverage, frontend lint/test/build, production audits, Docker configuration check, exploit regressions, reviewer verdict, and final `git status --short`.

---

## Self-Review Record

- Spec coverage: every verified Critical issue and the deploy-blocking Important issues have a task; lower-risk documentation, analytics, and CI gaps are covered in Tasks 9-11.
- Prohibited-marker scan: clean; every implementation step names its files, interfaces, command, and expected result.
- Type consistency: checkout is authenticated in both route trees; payment methods are split into direct and VNPay validators; public catalog methods and rate-limit repository interfaces are named consistently across producing and consuming tasks.
- Scope decision: authenticated checkout is intentional because `frontend/src/pages/Cart.jsx` and `README.md` already require it. If product requirements later restore guest checkout, that is a separate feature requiring receipt tokens, reservation expiry, anti-abuse controls, and new privacy tests.
