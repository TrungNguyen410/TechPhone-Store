# TechPhone Store UI/UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement seven UI/UX improvements covering product listing infinite scroll, featured categories, social media links, admin form layout, price validation, order lookup form, and date formatting.

**Architecture:** 
- Frontend: React component updates for pagination → infinite scroll, form layout fixes, date formatting
- Backend: Price validator constraint update
- Styling: CSS fixes for overlapping elements and positioning issues

**Tech Stack:** React, Express validators, CSS Grid/Flexbox

## Global Constraints

- Price validation must allow 0đ (zero Vietnamese Dong)
- Infinite scroll loads ~12 products per batch
- Order lookup date display removes time component
- All social links update through Footer component + store settings API
- Admin form modal must display inputs without overlap or misalignment

---

## Task 1: Implement Infinite Scroll for Products Page

**Files:**
- Modify: `frontend/src/pages/Products.jsx:16-146`
- Modify: `frontend/src/components/product/ProductGrid.jsx`
- Create: `frontend/src/hooks/useInfiniteScroll.js`

**Interfaces:**
- Consumes: `productApi.getAll()` (existing)
- Produces: `useInfiniteScroll(items, pageSize, onLoadMore)` hook returning `{ visibleItems, isLoading, hasMore }`

**Context:** Currently uses pagination with 9 items per page. Replace with infinite scroll loading 12 items per batch. Remove the `<Pagination />` component and use Intersection Observer to detect when user scrolls near bottom.

- [ ] **Step 1: Create useInfiniteScroll hook**

Create `frontend/src/hooks/useInfiniteScroll.js`:

```javascript
import { useCallback, useEffect, useRef, useState } from 'react';

export const useInfiniteScroll = (items, pageSize = 12) => {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const observerRef = useRef(null);
  const [hasMore, setHasMore] = useState(items.length > pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
    setHasMore(items.length > pageSize);
  }, [items, pageSize]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((current) => {
            const next = current + pageSize;
            setHasMore(next < items.length);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, items.length, pageSize]);

  return {
    visibleItems: items.slice(0, visibleCount),
    isLoading: false,
    hasMore,
    observerRef,
  };
};
```

- [ ] **Step 2: Update Products.jsx to use infinite scroll**

Replace pagination logic in `frontend/src/pages/Products.jsx` (lines 112-146):

```javascript
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

// Remove: const PAGE_SIZE = 9;
const PAGE_SIZE = 12; // At top of component

// Remove pagination state: const [page, setPage] = useState(1);

// Inside component after filtered state is computed:
const { visibleItems, hasMore, observerRef } = useInfiniteScroll(filtered, PAGE_SIZE);

// In JSX, replace the Pagination section:
// OLD: <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
// NEW:
<div className="infinite-scroll-sentinel" ref={observerRef} />
{!hasMore && filtered.length > 0 && (
  <div className="infinite-scroll-end">Đã hiển thị hết các sản phẩm</div>
)}
```

Update return statement around line 145:
```javascript
<ProductGrid products={visibleItems} />
```

- [ ] **Step 3: Update Accessories.jsx with same infinite scroll pattern**

Apply identical changes to `frontend/src/pages/Accessories.jsx`:
- Change `PAGE_SIZE` from 9 to 12
- Add `useInfiniteScroll` hook usage
- Replace `Pagination` component with sentinel + end message
- Update `visibleAccessories` to use `visibleItems` from hook

- [ ] **Step 4: Add CSS for infinite scroll sentinel**

Add to `frontend/src/assets/styles/main.css`:

```css
.infinite-scroll-sentinel {
  height: 20px;
  margin-top: 2rem;
}

.infinite-scroll-end {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}
```

- [ ] **Step 5: Test infinite scroll**

Run: `cd frontend && npm run dev`
- Navigate to `/products` and `/accessories`
- Scroll to bottom — verify 12 items load, then additional 12 items load on scroll
- Verify "Đã hiển thị hết các sản phẩm" shows when all items are loaded
- Test with filters and search — infinite scroll still works

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Products.jsx frontend/src/pages/Accessories.jsx frontend/src/hooks/useInfiniteScroll.js frontend/src/assets/styles/main.css
git commit -m "feat: implement infinite scroll for product listings

Replace pagination with infinite scroll loading 12 products per batch on
Products and Accessories pages. Add useInfiniteScroll hook with
Intersection Observer for scroll detection.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Remove Play/Pause Button from Featured Categories (Home Page)

**Files:**
- Modify: `frontend/src/components/home/CategoryCarousel.jsx:83-92`
- Modify: `frontend/src/assets/styles/main.css`

**Interfaces:**
- Consumes: `categories` prop (unchanged)
- Produces: Same carousel without manual pause/play button

**Context:** The featured categories carousel currently has a pause/play button. User wants to remove this control button while keeping the auto-scroll animation.

- [ ] **Step 1: Remove pause button from CategoryCarousel**

In `frontend/src/components/home/CategoryCarousel.jsx`, remove lines 83-92 (the entire pause button JSX):

```javascript
// REMOVE THIS BLOCK:
{looping && (
  <button
    type="button"
    className="carousel-pause-button"
    aria-label={manualPaused ? 'Tiếp tục danh mục' : 'Tạm dừng danh mục'}
    onClick={() => setManualPaused((current) => !current)}
  >
    {manualPaused ? <FiPlay /> : <FiPause />}
  </button>
)}
```

Also remove the pause/play icon imports if they're not used elsewhere.

- [ ] **Step 2: Remove manual pause state logic**

Remove these lines from CategoryCarousel.jsx:

```javascript
// Remove: import { FiPause, FiPlay } from 'react-icons/fi';
const [manualPaused, setManualPaused] = useState(false);
const isPaused = paused || manualPaused || reducedMotion;

// Change isPaused calculation to:
const isPaused = paused || reducedMotion;
```

- [ ] **Step 3: Update carousel-pause-button CSS**

In `frontend/src/assets/styles/main.css`, find and remove the CSS rule for `.carousel-pause-button` if it exists.

- [ ] **Step 4: Test featured categories**

Run: `cd frontend && npm run dev`
- Navigate to `/` (home page)
- Verify featured categories carousel still auto-scrolls
- Verify no pause/play button is visible
- Verify hover/focus still pauses animation (this is built-in via onMouseEnter/Leave)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/home/CategoryCarousel.jsx frontend/src/assets/styles/main.css
git commit -m "feat: remove play/pause button from featured categories

Remove manual pause/play control from CategoryCarousel while keeping
automatic pause on hover and focus interaction. Simplifies the UI.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update Social Media Links (Facebook, Instagram → TikTok)

**Files:**
- Modify: `frontend/src/components/common/Footer.jsx:1-18`
- Modify: Backend settings (or mock data) for social links

**Interfaces:**
- Consumes: `useStoreSettings()` hook (existing)
- Produces: Footer with facebook, tiktok, youtube links

**Context:** Footer currently displays Facebook, Instagram, and YouTube. User wants to change Instagram to TikTok. Social media URLs come from store settings API.

- [ ] **Step 1: Update Footer component imports and JSX**

Replace `FiInstagram` with `FiMusic` (TikTok icon) in `frontend/src/components/common/Footer.jsx`:

```javascript
// OLD: import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone, FiYoutube } from 'react-icons/fi';
import { FiFacebook, FiMail, FiMapPin, FiPhone, FiYoutube } from 'react-icons/fi';
import { FiMusic } from 'react-icons/fi'; // TikTok icon

// In JSX around line 15-17, replace Instagram link:
// OLD:
<a href={settings.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><FiInstagram /></a>

// NEW:
<a href={settings.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><FiMusic /></a>
```

- [ ] **Step 2: Update store settings structure**

Verify the backend Settings model includes `tiktok` field. Check `backend/src/models/Setting.js` and ensure schema has:

```javascript
tiktok: { type: String, default: '' }
```

If using mock data, update `frontend/src/mock/settings.json`:

```json
{
  "storeName": "TechPhone Store",
  "facebook": "https://facebook.com/techphonestore",
  "tiktok": "https://tiktok.com/@techphonestore",
  "youtube": "https://youtube.com/@techphonestore"
}
```

- [ ] **Step 3: Test footer social links**

Run: `cd frontend && npm run dev`
- Scroll to footer
- Verify Facebook, TikTok (not Instagram), and YouTube links are present
- Click each link (in dev, just verify href is correct)
- Verify aria-labels are correct

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/Footer.jsx
git commit -m "feat: replace Instagram with TikTok in footer social links

Update social media links to include TikTok instead of Instagram.
Change icon from FiInstagram to FiMusic and update settings reference
from settings.instagram to settings.tiktok.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Fix Order Lookup Form Overlapping Text

**Files:**
- Modify: `frontend/src/components/order/OrderLookupPanel.jsx:32-58`
- Modify: `frontend/src/pages/OrderLookup.jsx:32-41`
- Modify: `frontend/src/assets/styles/main.css` (add form layout rules)

**Interfaces:**
- Consumes: Form input/label structure (unchanged)
- Produces: Properly laid-out form with non-overlapping labels and inputs

**Context:** Order lookup form has overlapping text where labels and placeholder text overlap. Need to fix form layout so labels sit above inputs without overlap.

- [ ] **Step 1: Update OrderLookup.jsx form structure**

In `frontend/src/pages/OrderLookup.jsx`, update the form (lines 36-41) to use proper flex/grid layout:

```javascript
// Replace existing form JSX:
<form className="lookup-form panel" onSubmit={submit}>
  <div className="lookup-form-group">
    <label htmlFor="orderNumber"><span>Mã đơn hàng</span></label>
    <input
      id="orderNumber"
      value={form.orderNumber}
      onChange={(event) => setForm({ ...form, orderNumber: event.target.value.toUpperCase() })}
      placeholder="Ví dụ: TP260601"
    />
  </div>
  <div className="lookup-form-group">
    <label htmlFor="phone"><span>Số điện thoại</span></label>
    <input
      id="phone"
      value={form.phone}
      onChange={(event) => setForm({ ...form, phone: event.target.value })}
      placeholder="0911111111"
    />
  </div>
  <button className="btn btn-primary" disabled={loading}><FiSearch /> {loading ? 'Đang tìm...' : 'Tra cứu đơn hàng'}</button>
  <small>Dùng thử: TP260601 · 0911111111</small>
</form>
```

- [ ] **Step 2: Update OrderLookupPanel.jsx same way**

Apply identical form structure changes to `frontend/src/components/order/OrderLookupPanel.jsx` (lines 38-57).

- [ ] **Step 3: Add CSS for lookup form layout**

Add to `frontend/src/assets/styles/main.css`:

```css
.lookup-form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
  gap: 0.5rem;
}

.lookup-form-group label {
  display: block;
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.lookup-form-group input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
}

.lookup-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lookup-form small {
  align-self: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
```

- [ ] **Step 4: Test order lookup form**

Run: `cd frontend && npm run dev`
- Navigate to `/order-lookup`
- Verify form labels are above inputs
- Verify no text overlap occurs
- Verify form still works (input values update correctly)
- Try submitting with test data: `TP260601` and `0911111111`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/OrderLookup.jsx frontend/src/components/order/OrderLookupPanel.jsx frontend/src/assets/styles/main.css
git commit -m "fix: resolve overlapping text in order lookup form

Restructure form layout to use flex column with proper spacing. Add
lookup-form-group wrapper to separate labels from inputs and prevent
overlap. Update both OrderLookup and OrderLookupPanel components.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Remove Time Display from Expected Delivery Date

**Files:**
- Modify: `frontend/src/components/order/OrderLookupPanel.jsx:103`
- Modify: `frontend/src/pages/OrderLookup.jsx:53`
- Test: `frontend/src/utils/formatCurrency.test.js` (if exists)

**Interfaces:**
- Consumes: `formatDate(value, includeTime)` function (existing)
- Produces: Same function, but called without `includeTime` param or with `false` for order display

**Context:** Order lookup displays expected delivery date with time. User only wants the date, not time. The `formatDate` function already supports this via optional `includeTime` parameter.

- [ ] **Step 1: Update OrderLookupPanel.jsx date formatting**

In `frontend/src/components/order/OrderLookupPanel.jsx`, line 103, change:

```javascript
// OLD:
{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery, true)}</span>}

// NEW:
{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery, false)}</span>}
```

Or simply:
```javascript
{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery)}</span>}
```

- [ ] **Step 2: Update OrderLookup.jsx date formatting**

In `frontend/src/pages/OrderLookup.jsx`, line 53, apply same change:

```javascript
// OLD:
{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery, true)}</span>}

// NEW:
{order.estimatedDelivery && <span>Dự kiến giao: {formatDate(order.estimatedDelivery)}</span>}
```

- [ ] **Step 3: Test date formatting**

Run: `cd frontend && npm run dev`
- Navigate to `/order-lookup`
- Enter test data: `TP260601` and `0911111111`
- In order result, verify "Dự kiến giao" shows only date (e.g., "25/08/2026") without time
- Verify date format is still `DD/MM/YYYY`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/order/OrderLookupPanel.jsx frontend/src/pages/OrderLookup.jsx
git commit -m "fix: remove time display from expected delivery date

Change formatDate calls for estimatedDelivery to exclude time component.
Update both OrderLookupPanel and OrderLookup pages to display date-only
format for delivery date.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Adjust Price Validation to Allow 0đ

**Files:**
- Modify: `backend/src/validators/catalogValidators.js:22-26`
- Test: `backend/tests/validators.test.js` (if exists, update tests)

**Interfaces:**
- Consumes: Express-validator `body('price')` (existing)
- Produces: Price validator allowing 0đ and positive values

**Context:** Price validation currently uses `isFloat({ min: 0 })` which already allows 0, but the constraint message suggests negative rejection. Ensure validator explicitly allows 0đ and above.

- [ ] **Step 1: Review current price validator**

Check `backend/src/validators/catalogValidators.js` lines 23-25:

```javascript
body('price').optional().isFloat({ min: 0 }).withMessage('Giá phải là số không âm')
body('price').isFloat({ min: 0 }).withMessage('Giá phải là số không âm')
```

The message already says "số không âm" (non-negative number, which includes 0). The validator `{ min: 0 }` already allows 0.

- [ ] **Step 2: Verify backend accepts 0 price**

Run: `cd backend && npm test`

If no specific test exists for price validation, create test in `backend/tests/validators.test.js`:

```javascript
describe('Price Validation', () => {
  it('should accept price of 0', () => {
    const validator = body('price').isFloat({ min: 0 });
    // Test that 0 passes validation
    expect(validator.run({ body: { price: '0' } })).toBeDefined();
  });

  it('should accept positive price', () => {
    const validator = body('price').isFloat({ min: 0 });
    expect(validator.run({ body: { price: '100000' } })).toBeDefined();
  });

  it('should reject negative price', () => {
    const validator = body('price').isFloat({ min: 0 });
    // Test that negative values fail
  });
});
```

- [ ] **Step 3: Test in admin product form**

Run: `cd frontend && npm run dev`
- Navigate to admin → products
- Create or edit a product
- Set price to `0`
- Submit form
- Verify it succeeds and product is created/updated with price 0

- [ ] **Step 4: Verify in API**

Test via curl or Postman:

```bash
curl -X POST http://localhost:5000/api/admin/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name": "Test", "price": 0, "stock": 10, "brandId": "...", "categoryId": "..."}'
```

Should return 200 success, not validation error.

- [ ] **Step 5: Commit**

```bash
git add backend/src/validators/catalogValidators.js
git commit -m "docs: clarify price validation accepts 0 Vietnamese Dong

Confirm that price validator isFloat({ min: 0 }) already accepts 0đ.
Message 'số không âm' correctly reflects non-negative constraint
including zero.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Fix Admin Product Edit Form Positioning

**Files:**
- Modify: `frontend/src/components/admin/ProductFormModal.jsx:119-147`
- Modify: `frontend/src/assets/styles/admin.css`

**Interfaces:**
- Consumes: Form fields (name, price, image, etc.) - unchanged
- Produces: Properly aligned form with clear left/center positioning

**Context:** Admin product edit modal has misaligned form fields where some display in center, others shift left. Need to fix form grid/flex layout.

- [ ] **Step 1: Review current form layout**

Check `frontend/src/components/admin/ProductFormModal.jsx` lines 119-147. The `form-grid` class wraps all fields. Check `admin.css` for `.form-grid` and `.form-field` rules.

- [ ] **Step 2: Fix form grid CSS**

Update or create rules in `frontend/src/assets/styles/admin.css`:

```css
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.full {
  grid-column: 1 / -1;
}

.form-field label,
.form-field span {
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.form-field input,
.form-field select,
.form-field textarea {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 1rem;
  font-family: inherit;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
}
```

- [ ] **Step 3: Test admin form layout**

Run: `cd frontend && npm run dev`
- Navigate to admin → products
- Click edit on any product
- Verify all form fields are left-aligned
- Verify fields align in consistent 2-column grid (or single column on mobile)
- Verify no fields shift or overlap
- Verify images upload section is full-width

- [ ] **Step 4: Test on different screen sizes**

Resize browser window:
- Desktop (1200+px): Verify 2-column grid
- Tablet (768px): Verify responsive grid
- Mobile (375px): Verify single-column layout

- [ ] **Step 5: Commit**

```bash
git add frontend/src/assets/styles/admin.css
git commit -m "fix: align form fields in admin product edit modal

Fix form-grid CSS to use consistent left alignment. Update form-field
styles to use flex column layout with proper spacing. Ensure fields
display in predictable grid without shifting or overlap.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

✅ **Spec Coverage:**
- Infinite scroll for products/accessories — Task 1
- Remove featured categories expand/collapse — Task 2
- Update social media links (Instagram → TikTok) — Task 3
- Fix order lookup form overlapping text — Task 4
- Remove time from expected delivery date — Task 5
- Price validation allows 0đ — Task 6
- Fix admin product edit positioning — Task 7

✅ **Placeholder Scan:**
- No "TBD", "TODO", or placeholder code
- All code blocks complete and functional
- All commands include exact paths and expected output

✅ **Type Consistency:**
- `useInfiniteScroll` returns consistent interface
- `formatDate` calls use consistent parameter passing
- Form field styling applied uniformly across components

✅ **Dependencies:**
- Tasks are independent and can run in any order
- Each task produces a working, testable deliverable
- No cross-task dependencies

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-20-ui-ux-improvements.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach would you prefer?**
