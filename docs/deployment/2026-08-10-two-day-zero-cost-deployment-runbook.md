# TechPhone Store Zero-Cost Two-Day Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thành bản triển khai TechPhone Store có thể thêm sản phẩm, đặt đơn COD và trình bày báo cáo trước hết ngày 11/08/2026 mà không phát sinh chi phí.

**Architecture:** React/Vite được build thành static SPA trên Netlify và gọi Express REST API trên Vercel. API lưu dữ liệu trong MongoDB Atlas Free; ảnh sản phẩm được tải trực tiếp từ trình duyệt lên Cloudinary Free. OTP ưu tiên Twilio Verify Trial trong timebox 90 phút và chuyển sang tài khoản seed + bằng chứng local/test nếu SMS Việt Nam không hoạt động.

**Tech Stack:** React 19, Vite 8, Netlify, Express 5, Vercel Functions, MongoDB Atlas, Mongoose 9, Cloudinary unsigned upload, Twilio Verify Trial, Jest, Vitest, GitHub Actions, PowerShell.

## Global Constraints

- Hạn cuối là hết ngày 11/08/2026; không mở rộng tính năng.
- Tổng chi phí bắt buộc là 0 đồng; không nhập thẻ, không nâng cấp gói và không giao dịch tiền thật.
- COD là thanh toán bắt buộc; ngân hàng, MoMo và VNPay không được chặn deploy.
- Twilio chỉ được thử tối đa 90 phút và chỉ với số điện thoại đã xác minh.
- Vercel phải chạy `NODE_ENV=production`; không được trả `debugOtp` trên Internet.
- Không lưu MongoDB URI, JWT secret, Cloudinary API secret hoặc Twilio Auth Token trong Git, ảnh chụp hay báo cáo.
- Không chạy `git add .`; chỉ stage đúng file đã kiểm tra.
- Script seed xóa và tạo lại toàn bộ dữ liệu; chỉ chạy trên cluster demo mới hoặc sau khi đã xác nhận không có dữ liệu cần giữ.

---

## Cách dùng runbook

1. Thực hiện đúng thứ tự Task 1 đến Task 13.
2. Đánh dấu checkbox ngay sau khi bước đã đạt kết quả mong đợi.
3. Khi gặp lỗi, không thử ngẫu nhiên; chụp nguyên màn hình lỗi và đối chiếu mục “Xử lý lỗi nhanh”.
4. Không chuyển sang Twilio trước khi luồng thêm sản phẩm và COD của ngày 1 đã PASS.
5. Lưu ảnh bằng chứng ngoài repository, ví dụ `D:\TechPhone-Evidence-2026-08-11`.

## Phiếu ghi thông tin triển khai

Không ghi secret vào bảng này. Chỉ ghi URL, tên project và bốn ký tự cuối để nhận diện.

| Giá trị | Nội dung cần ghi |
|---|---|
| GitHub repository | `TrungNguyen410/TechPhone-Store` |
| Production branch | `main` |
| Atlas project | Tên project hiển thị trên Atlas |
| Atlas cluster | Tên cluster hiển thị trên Atlas |
| Atlas database user | Username, không ghi password |
| Vercel project | Tên project backend |
| Vercel production URL | URL kết thúc bằng `.vercel.app` |
| Netlify site | Tên site frontend |
| Netlify production URL | URL kết thúc bằng `.netlify.app` |
| Cloudinary cloud name | Cloud name, không phải API secret |
| Cloudinary upload preset | Tên unsigned preset |
| Twilio Verify Service SID | Chỉ ghi bốn ký tự cuối |
| Demo admin phone | `0900000000` |
| Demo customer phone | `0911111111` |
| Demo password | Lưu trong password manager, không ghi trong file |

---

## NGÀY 1 — Deploy, seed, Cloudinary và thêm sản phẩm

### Task 1: Đóng băng phạm vi và xác minh source local

**Files:**
- Inspect: `backend/package.json`
- Inspect: `frontend/package.json`
- Inspect: `.github/workflows/ci.yml`
- Do not stage: `.env`, `.env.*`, `frontend/dist/`, `backend/coverage/`

**Interfaces:**
- Consumes: branch `main` và hai lockfile hiện tại.
- Produces: baseline PASS/FAIL trước deploy và commit hash dùng trong báo cáo.

- [ ] **Step 1: Mở PowerShell tại repository**

```powershell
Set-Location 'D:\TechPhone Store'
git branch --show-current
git log -1 --oneline
git status --short
```

Expected: branch là `main`; ghi commit hash vào sổ triển khai. Không xóa hoặc stage các thay đổi không liên quan.

- [ ] **Step 2: Kiểm tra phiên bản Node**

```powershell
node --version
npm.cmd --version
```

Expected: Node từ `22.12.0` trở lên. Nếu máy đang dùng Node 24 thì vẫn có thể chạy local; Task 2 sẽ pin Node 22 cho CI/deploy để nhất quán.

- [ ] **Step 3: Cài đúng dependency backend và chạy coverage**

```powershell
Set-Location 'D:\TechPhone Store\backend'
npm.cmd ci
npm.cmd run test:coverage
```

Expected: 18 test suites và 94 tests pass; coverage vượt branches 65%, functions 70%, lines 85%, statements 80%.

- [ ] **Step 4: Cài đúng dependency frontend và chạy toàn bộ gate**

```powershell
Set-Location 'D:\TechPhone Store\frontend'
npm.cmd ci
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
```

Expected: lint exit 0, 41 test files/126 tests pass, Vite build exit 0.

- [ ] **Step 5: Chụp bằng chứng baseline**

Chụp hai ảnh terminal: backend coverage PASS và frontend lint/test/build PASS. Không chụp terminal đang hiển thị env hoặc secret.

---

### Task 2: Áp dụng các chỉnh sửa production tối thiểu

**Files:**
- Modify: `backend/src/app.js`
- Modify: `backend/src/config/swagger.js`
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `backend/Dockerfile`
- Modify: `frontend/Dockerfile`
- Modify: `.github/workflows/ci.yml`
- Modify mechanically: `frontend/package-lock.json`

**Interfaces:**
- Consumes: `env.apiPublicUrl`, Express app và CI hiện tại.
- Produces: proxy-aware API, Swagger đúng production URL, Node 22 thống nhất và CI chạy frontend tests.

- [ ] **Step 1: Thêm trust proxy đúng một hop**

Trong `backend/src/app.js`, ngay sau `const app = express();`, thêm:

```js
app.set('trust proxy', 1);
```

Expected: `req.ip` dùng client IP do Vercel proxy chuyển vào, giúp rate limit không gom mọi người thành cùng một IP.

- [ ] **Step 2: Cho Swagger dùng `API_PUBLIC_URL`**

Trong đầu `backend/src/config/swagger.js`, thêm:

```js
const env = require('./env');

const productionApiUrl = `${env.apiPublicUrl.replace(/\/+$/, '')}/api`;
```

Thay mảng `servers` bằng:

```js
servers: [
  { url: 'http://localhost:5000/api', description: 'Local development' },
  { url: productionApiUrl, description: 'Configured deployment' },
],
```

Expected: Swagger không còn URL Render mẫu.

- [ ] **Step 3: Pin Node 22 trong hai package manifest**

Thêm cùng cấp với `scripts` trong cả `backend/package.json` và `frontend/package.json`:

```json
"engines": {
  "node": ">=22.12 <23"
}
```

- [ ] **Step 4: Đồng bộ hai Dockerfile**

Đổi dòng đầu của `backend/Dockerfile` và `frontend/Dockerfile` thành:

```dockerfile
FROM node:22-alpine AS production
```

Nếu frontend Dockerfile đặt stage là `build`, giữ nguyên tên stage và chỉ đổi phiên bản:

```dockerfile
FROM node:22-alpine AS build
```

- [ ] **Step 5: Chuyển Vite tooling về devDependencies**

```powershell
Set-Location 'D:\TechPhone Store\frontend'
npm.cmd install --save-dev vite@^8.0.16 @vitejs/plugin-react@^5.1.1
```

Expected: `vite` và `@vitejs/plugin-react` chỉ nằm trong `devDependencies`; `package-lock.json` được cập nhật bởi npm.

- [ ] **Step 6: Thêm frontend test gate vào CI**

Trong `.github/workflows/ci.yml`, đặt đoạn sau sau `Lint frontend` và trước `Build frontend`:

```yaml
      - name: Run frontend tests
        run: npm run test:run
```

- [ ] **Step 7: Chạy lại gate sau chỉnh sửa**

```powershell
Set-Location 'D:\TechPhone Store\backend'
npm.cmd test
Set-Location 'D:\TechPhone Store\frontend'
npm.cmd run lint
npm.cmd run test:run
npm.cmd run build
npm.cmd audit --omit=dev
```

Expected: tests/build PASS. Production audit phải không còn kéo Vite/PostCSS/nanoid qua `dependencies`; nếu npm vẫn báo advisory build-time chưa có fix, chụp output và ghi ngoại lệ trong báo cáo, không dùng `npm audit fix --force`.

- [ ] **Step 8: Commit đúng phạm vi**

```powershell
Set-Location 'D:\TechPhone Store'
git diff --check
git add -- backend/src/app.js backend/src/config/swagger.js backend/package.json backend/package-lock.json backend/Dockerfile frontend/package.json frontend/package-lock.json frontend/Dockerfile .github/workflows/ci.yml
git diff --cached --stat
git commit -m "chore: prepare production deployment"
git push origin main
```

Expected: commit chỉ chứa các file liệt kê; GitHub Actions bắt đầu chạy.

---

### Task 3: Tạo MongoDB Atlas Free

**Files:**
- Local secret file only: `backend/.env` (ignored by Git)
- Source reference: `backend/.env.example`

**Interfaces:**
- Consumes: tài khoản email và repository đã push.
- Produces: Atlas replica-set connection string dùng bởi Vercel và seed script.

- [ ] **Step 1: Tạo tài khoản Atlas**

Mở `https://www.mongodb.com/cloud/atlas/register`, đăng ký và xác minh email. Chọn gói Free; không nhập thẻ.

- [ ] **Step 2: Tạo project và cluster**

Trong Atlas:

1. Chọn **New Project**.
2. Đặt tên `TechPhone Store Demo`.
3. Chọn **Build a Database** hoặc **Create Deployment**.
4. Chọn **Free / M0**.
5. Chọn region miễn phí gần Việt Nam nhất, ưu tiên Singapore nếu giao diện cung cấp.
6. Đặt cluster name `techphone-demo`.
7. Tạo cluster.

Expected: cluster ở trạng thái Available; Atlas Free là replica set phù hợp transaction của dự án.

- [ ] **Step 3: Tạo database user riêng cho ứng dụng**

Trong **Security → Database Access**:

1. Chọn **Add New Database User**.
2. Authentication method: Password.
3. Username: `techphone_app`.
4. Tạo password ngẫu nhiên tối thiểu 20 ký tự; để tránh lỗi URL trong hai ngày này, dùng chữ hoa, chữ thường và số.
5. Role: **Read and write to any database**.
6. Lưu password trong password manager.

- [ ] **Step 4: Mở network access cho Vercel demo**

Trong **Security → Network Access**:

1. Chọn **Add IP Address**.
2. Chọn **Allow Access from Anywhere** để thêm `0.0.0.0/0`.
3. Ghi chú `Vercel Hobby demo - remove after presentation`.
4. Xác nhận.

Security note: chỉ dùng cấu hình này cho cluster demo với password mạnh; sau buổi bảo vệ hãy xóa rule hoặc xóa cluster.

- [ ] **Step 5: Lấy connection string**

Trong **Database → Clusters → Connect → Drivers**:

1. Chọn Driver `Node.js`.
2. Copy connection string.
3. Thay password marker do Atlas hiển thị bằng password database user.
4. Bảo đảm URI chứa tên database `techphone_store` trước phần query string.
5. Lưu URI trong password manager, không dán vào file Markdown hoặc chat.

Expected format: URI bắt đầu `mongodb+srv://techphone_app:` và chứa `/techphone_store?`.

- [ ] **Step 6: Tạo local env ignored bởi Git**

```powershell
Set-Location 'D:\TechPhone Store\backend'
Copy-Item '.env.example' '.env'
notepad '.env'
```

Trong `backend/.env`, đặt:

```dotenv
NODE_ENV=production
MONGO_URI=URI_ATLAS_DA_LUU_TRONG_PASSWORD_MANAGER
JWT_ACCESS_SECRET=SECRET_NGAU_NHIEN_THU_NHAT
JWT_REFRESH_SECRET=SECRET_NGAU_NHIEN_THU_HAI
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:5000
SEED_DEMO_PASSWORD=MAT_KHAU_DEMO_TOI_THIEU_12_KY_TU
```

Các chuỗi viết hoa ở trên là nhãn hướng dẫn, không phải giá trị được phép giữ lại. Trước khi lưu, thay toàn bộ bằng giá trị thật trong password manager.

- [ ] **Step 7: Kiểm tra file không thể bị commit**

```powershell
Set-Location 'D:\TechPhone Store'
git check-ignore -v backend/.env
git status --short
```

Expected: `backend/.env` được ignore và không xuất hiện như file cần commit.

---

### Task 4: Tạo Netlify site để giữ URL frontend

**Files:**
- Read: `frontend/public/_redirects`
- No repository changes required.

**Interfaces:**
- Consumes: GitHub repository và frontend Vite build.
- Produces: URL Netlify ổn định dùng làm CORS origin cho backend.

- [ ] **Step 1: Import repository**

Mở `https://app.netlify.com/`, đăng nhập bằng GitHub, chọn **Add new project → Import an existing project → GitHub**, rồi chọn `TechPhone-Store`.

- [ ] **Step 2: Cấu hình build lần đầu**

Đặt chính xác:

```text
Production branch: main
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

Không đặt `frontend/dist` vì publish directory được tính từ Base Directory.

- [ ] **Step 3: Thêm env cho lần deploy giữ chỗ**

Trong phần environment variables thêm:

```text
VITE_USE_MOCK = true
```

Chưa thêm API URL trong lần này.

- [ ] **Step 4: Deploy và đặt tên site ổn định**

Chọn **Deploy**. Khi deploy thành công:

1. Mở **Site configuration → General → Change site name**.
2. Chọn tên dễ đọc, ví dụ `techphone-store-demo` nếu còn trống.
3. Ghi URL `.netlify.app` vào phiếu triển khai.

Expected: trang mock mở được. Đây mới là bước giữ URL; chưa phải production connected.

- [ ] **Step 5: Kiểm tra SPA rewrite**

Mở trực tiếp đường dẫn `/products`, sau đó refresh trình duyệt.

Expected: không có lỗi 404 nhờ `frontend/public/_redirects` chứa `/* /index.html 200`.

---

### Task 5: Deploy Express backend lên Vercel

**Files:**
- Read: `backend/server.js`
- Read: `backend/.env.example`
- No secret files committed.

**Interfaces:**
- Consumes: Atlas URI, Netlify URL và production secrets.
- Produces: Vercel API URL và health endpoint công khai.

- [ ] **Step 1: Tạo hai JWT secrets trên máy**

Chạy hai lần và lưu hai output khác nhau trong password manager:

```powershell
$SecretBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Fill($SecretBytes)
[Convert]::ToBase64String($SecretBytes)
```

Không chụp màn hình output và không dùng cùng một secret cho access/refresh.

- [ ] **Step 2: Import repository vào Vercel**

Mở `https://vercel.com/new`, đăng nhập GitHub, import `TechPhone-Store` và đặt:

```text
Project name: techphone-api-demo hoặc tên khả dụng tương đương
Framework preset: Other
Root Directory: backend
Production branch: main
```

Không đặt Output Directory. Không cần `vercel.json`; Vercel hiện nhận diện Express `server.js` và `app.listen()`.

- [ ] **Step 3: Thêm env trước deployment**

Trong **Environment Variables**, thêm cho Production, Preview và Development nếu UI cho chọn nhiều môi trường:

```text
NODE_ENV = production
MONGO_URI = giá trị Atlas URI trong password manager
JWT_ACCESS_SECRET = secret ngẫu nhiên thứ nhất
JWT_REFRESH_SECRET = secret ngẫu nhiên thứ hai
JWT_ACCESS_EXPIRES_IN = 15m
JWT_REFRESH_EXPIRES_IN = 7d
FRONTEND_URL = URL Netlify đã ghi
PUBLIC_SITE_URL = URL Netlify đã ghi
API_PUBLIC_URL = URL Vercel dự kiến theo project name
SEED_DEMO_PASSWORD = mật khẩu demo mạnh đã lưu
```

Không thêm `PORT`; Vercel quản lý runtime port.

- [ ] **Step 4: Deploy**

Chọn **Deploy** và chờ trạng thái Ready. Ghi production URL thực tế vào phiếu triển khai.

- [ ] **Step 5: Sửa `API_PUBLIC_URL` nếu URL thực tế khác dự kiến**

Trong **Settings → Environment Variables**, cập nhật `API_PUBLIC_URL` bằng production URL thực tế, không thêm `/api` ở cuối. Sau đó vào **Deployments**, chọn deployment mới nhất → menu ba chấm → **Redeploy**.

- [ ] **Step 6: Kiểm tra health và Swagger**

```powershell
$BackendUrl = Read-Host 'Paste Vercel production URL without trailing slash'
Invoke-RestMethod "$BackendUrl/api/health" | ConvertTo-Json -Depth 5
Start-Process "$BackendUrl/api/docs"
```

Expected: health có `success: true`, `data.status: ok`; Swagger mở và server configured trỏ về Vercel URL.

Nếu health trả 500 hoặc timeout, mở Vercel **Logs** và xem mục “Xử lý lỗi nhanh” trước khi tiếp tục.

---

### Task 6: Seed dữ liệu demo vào Atlas

**Files:**
- Execute: `backend/src/seed/seed.js`
- Local secret file: `backend/.env`

**Interfaces:**
- Consumes: Atlas URI và `SEED_DEMO_PASSWORD` production.
- Produces: products, taxonomy, users, vouchers, orders và settings demo trong Atlas.

- [ ] **Step 1: Xác nhận database được phép xóa toàn bộ dữ liệu**

Chỉ tiếp tục nếu Atlas cluster vừa tạo và chưa chứa dữ liệu cần giữ. `npm run seed` gọi `deleteMany({})` trên toàn bộ collection của TechPhone.

- [ ] **Step 2: Kiểm tra env không còn nhãn hướng dẫn**

Mở `backend/.env` và xác minh:

- `NODE_ENV=production`.
- URI bắt đầu bằng `mongodb+srv://`.
- Hai JWT secrets dài ít nhất 32 ký tự và khác nhau.
- `SEED_DEMO_PASSWORD` dài ít nhất 12 ký tự, không phải `123456`.

- [ ] **Step 3: Chạy seed đúng một lần**

```powershell
Set-Location 'D:\TechPhone Store\backend'
npm.cmd run seed
```

Expected: terminal in `TechPhone seed data inserted successfully.` và exit 0.

- [ ] **Step 4: Không chạy migration trên database vừa seed**

`migrate:taxonomy` và `migrate:phone-auth` chỉ dành cho database cũ. Database mới từ Task 6 đã có taxonomy và phone auth đúng cấu trúc.

- [ ] **Step 5: Kiểm tra dữ liệu qua Atlas**

Trong Atlas mở **Browse Collections** và database `techphone_store`.

Expected tối thiểu:

- collection `products` có sản phẩm.
- collection `users` có `user-admin` và `user-customer`.
- collection `orders` có đơn mẫu.
- collection `brands` và `categories` có dữ liệu active.

Chụp ảnh danh sách collection nhưng che username/cluster URI nếu xuất hiện.

- [ ] **Step 6: Kiểm tra API sau seed**

```powershell
$BackendUrl = Read-Host 'Paste Vercel production URL without trailing slash'
Invoke-RestMethod "$BackendUrl/api/products?limit=2" | ConvertTo-Json -Depth 5
Invoke-RestMethod "$BackendUrl/api/payments/config" | ConvertTo-Json -Depth 5
```

Expected: products trả dữ liệu; payment config tối thiểu bật COD.

---

### Task 7: Nối Netlify frontend với Vercel backend

**Files:**
- Read: `frontend/.env.example`
- Build-generated: `frontend/dist/`

**Interfaces:**
- Consumes: Netlify URL và Vercel URL đã xác minh.
- Produces: production SPA dùng API thật và metadata SEO đúng URL.

- [ ] **Step 1: Cập nhật Netlify environment variables**

Trong Netlify **Site configuration → Environment variables**, đặt:

```text
VITE_USE_MOCK = false
VITE_API_URL = Vercel production URL cộng /api
VITE_SITE_URL = Netlify production URL
```

Ví dụ hợp lệ:

```text
VITE_API_URL = https://techphone-api-demo.vercel.app/api
VITE_SITE_URL = https://techphone-store-demo.netlify.app
```

Thay hai URL ví dụ bằng URL thực tế trong phiếu triển khai.

- [ ] **Step 2: Redeploy không dùng cache cũ**

Vào **Deploys → Trigger deploy → Clear cache and deploy site**.

Expected: build command `npm run build`, publish `frontend/dist` tính từ repository nhưng UI hiển thị publish relative là `dist`.

- [ ] **Step 3: Kiểm tra CORS và API mode**

Mở Netlify site → DevTools → Network → reload.

Expected:

- request tới `/products`, `/banners`, `/settings` dùng domain Vercel.
- status 200.
- không có lỗi CORS.
- Local Storage không sinh dữ liệu catalog mock mới sau khi clear storage và reload.

- [ ] **Step 4: Kiểm tra đăng nhập seed**

Đăng nhập admin:

```text
Phone: 0900000000
Password: giá trị SEED_DEMO_PASSWORD trong password manager
```

Expected: chuyển vào `/admin` và dashboard hiển thị dữ liệu Atlas.

- [ ] **Step 5: Chụp bằng chứng kết nối**

Chụp DevTools Network với một request frontend → Vercel 200 và trang admin dashboard; không mở tab Headers chứa Authorization token khi chụp.

---

### Task 8: Cấu hình Cloudinary Free cho upload ảnh sản phẩm

**Files:**
- Runtime consumer: `frontend/src/api/uploadApi.js`
- No Cloudinary secret committed.

**Interfaces:**
- Consumes: Netlify build env.
- Produces: HTTPS image URL tồn tại ngoài Vercel filesystem.

- [ ] **Step 1: Tạo Cloudinary Free account**

Mở `https://cloudinary.com/users/register_free`, đăng ký, xác minh email và chọn gói Free. Không nhập thẻ.

- [ ] **Step 2: Ghi Cloud Name**

Trong Cloudinary Console, mở **Settings → API Keys** hoặc Dashboard và ghi `Cloud name` vào phiếu triển khai.

Không đưa API Key/API Secret vào frontend; code hiện chỉ cần Cloud Name và unsigned preset.

- [ ] **Step 3: Tạo unsigned upload preset**

Trong **Settings → Upload → Upload presets → Add upload preset**:

```text
Preset name: techphone_demo_unsigned
Signing mode: Unsigned
Asset folder: techphone-demo
Allowed formats: jpg,jpeg,png,webp
Maximum file size: 5242880 bytes
Disallow public ID: enabled
```

Nếu UI dùng MB, đặt 5 MB. Lưu preset.

- [ ] **Step 4: Thêm hai env Netlify**

```text
VITE_CLOUDINARY_CLOUD_NAME = cloud name đã ghi
VITE_CLOUDINARY_UPLOAD_PRESET = techphone_demo_unsigned
```

Sau đó **Clear cache and deploy site**.

- [ ] **Step 5: Chuẩn bị ảnh demo hợp lệ**

Dùng một ảnh JPG/PNG/WebP do bạn sở hữu, dưới 5 MB, tên file `techphone-demo-product.jpg`. Không dùng ảnh chứa thông tin cá nhân.

- [ ] **Step 6: Kiểm tra upload trên production**

Đăng nhập admin → **Sản phẩm → Thêm sản phẩm → Tải ảnh từ máy**.

Expected: upload thành công và URL ảnh bắt đầu `https://res.cloudinary.com/`.

Nếu nút upload không xuất hiện, kiểm tra hai env có cùng scope Production và đã redeploy sau khi thêm env.

---

### Task 9: Thêm sản phẩm production và chứng minh dữ liệu tồn tại

**Files:**
- Runtime UI: `frontend/src/components/admin/ProductFormModal.jsx`
- Runtime API: `backend/src/routes/adminRoutes.js`
- Runtime collection: Atlas `techphone_store.products`

**Interfaces:**
- Consumes: admin session, active brand/category và Cloudinary URL.
- Produces: một sản phẩm production dùng làm bằng chứng báo cáo.

- [ ] **Step 1: Mở form thêm sản phẩm**

Tại Netlify site đăng nhập admin → `/admin/products` → **Thêm sản phẩm**.

- [ ] **Step 2: Nhập bộ dữ liệu demo cố định**

```text
Tên: TechPhone Demo 5G
Thương hiệu: Samsung
Danh mục: Dien thoai
Giá bán: 12990000
Giá cũ: 14990000
Tồn kho: 20
Trạng thái: Đang bán
RAM: 8GB
Bộ nhớ: 256GB
Màn hình: 6.7 inch OLED 120Hz
Pin: 5000 mAh
Camera: 50MP
Chip: Demo Octa-core
Mô tả: Sản phẩm minh họa cho quy trình quản trị, lưu trữ ảnh Cloudinary và đồng bộ dữ liệu MongoDB Atlas.
```

Tải ảnh từ Task 8 và bấm lưu.

- [ ] **Step 3: Xác minh tại trang khách**

Đăng xuất admin hoặc mở cửa sổ Incognito → `/products` → tìm `TechPhone Demo 5G`.

Expected: sản phẩm xuất hiện, ảnh tải từ Cloudinary, giá/tồn kho đúng và trang chi tiết mở được.

- [ ] **Step 4: Xác minh trong Atlas**

Atlas → Browse Collections → `techphone_store.products` → Filter:

```json
{ "name": "TechPhone Demo 5G" }
```

Expected: đúng một document có `status: active`, `stock: 20` và URL Cloudinary.

- [ ] **Step 5: Chứng minh persistence qua redeploy**

Trigger một Netlify redeploy, sau đó reload `/products`.

Expected: sản phẩm vẫn tồn tại vì dữ liệu nằm trong Atlas, không nằm trong localStorage hoặc filesystem Vercel.

- [ ] **Step 6: Chụp ba ảnh báo cáo**

1. Form admin sau khi điền sản phẩm, che token/secret.
2. Sản phẩm trên trang khách.
3. Document sản phẩm trong Atlas, chỉ hiển thị field nghiệp vụ.

---

### Task 10: Xác minh luồng COD và kết thúc ngày 1

**Files:**
- Runtime UI: `frontend/src/pages/Checkout.jsx`
- Runtime service: `backend/src/services/orderService.js`

**Interfaces:**
- Consumes: sản phẩm active có stock và API production.
- Produces: một đơn COD mới có thể tra cứu và quản trị.

- [ ] **Step 1: Đặt đơn COD**

Đăng nhập customer `0911111111` bằng production seed password, thêm `TechPhone Demo 5G` vào giỏ và checkout với dữ liệu hợp lệ. Chọn COD.

- [ ] **Step 2: Ghi mã đơn**

Sau khi đặt thành công, ghi order number hiển thị trên trang thành công. Không chỉ dựa vào order ID nội bộ.

- [ ] **Step 3: Tra cứu đơn công khai**

Mở `/order-lookup`, nhập order number vừa ghi và số `0911111111`.

Expected: thông tin đơn và trạng thái `pending` hiển thị.

- [ ] **Step 4: Xử lý đơn trong admin**

Đăng nhập admin → Orders → tìm order number → đổi trạng thái theo một bước hợp lệ, ví dụ `pending` → `confirmed`.

Expected: trang tra cứu phản ánh trạng thái mới sau reload.

- [ ] **Step 5: Kiểm tra tồn kho**

Xem sản phẩm trong admin/Atlas và xác minh stock giảm theo quantity đã đặt.

- [ ] **Step 6: Chốt ngày 1**

Ngày 1 chỉ được coi PASS khi các mục sau đều đúng:

- Vercel health PASS.
- Netlify gọi Vercel không lỗi CORS.
- Admin login PASS.
- Cloudinary upload PASS.
- Thêm sản phẩm và persistence PASS.
- COD, lookup và admin status PASS.

Nếu đủ sáu mục, dừng thay đổi nghiệp vụ và chuyển sang OTP vào ngày 2.

---

## NGÀY 2 — Twilio Trial, fallback, kiểm thử và báo cáo

### Task 11: Chuẩn bị code Twilio Verify bằng TDD

**Files:**
- Modify: `backend/src/utils/phone.js`
- Modify: `backend/src/config/env.js`
- Modify: `backend/src/services/otpDeliveryService.js`
- Modify: `backend/src/services/authService.js`
- Modify: `backend/.env.example`
- Test: `backend/tests/phone-normalization.test.js`
- Test: `backend/tests/otp-delivery-service.test.js`
- Regression: `backend/tests/auth.test.js`

**Interfaces:**
- Consumes: Twilio Verify REST endpoints, locally normalized Vietnamese phone and existing `VerificationCode` record.
- Produces: `toE164VietnamesePhone(value): string|null`, `OtpDeliveryService.usesProviderVerification(): boolean`, `OtpDeliveryService.verify(target, code): Promise<boolean>`.

- [ ] **Step 1: Viết test E.164 trước**

Thêm import và test vào `backend/tests/phone-normalization.test.js`:

```js
const { normalizeVietnamesePhone, toE164VietnamesePhone } = require('../src/utils/phone');

it('converts a Vietnamese mobile number to E.164 for SMS providers', () => {
  expect(toE164VietnamesePhone('0912345678')).toBe('+84912345678');
  expect(toE164VietnamesePhone('+84 912 345 678')).toBe('+84912345678');
  expect(toE164VietnamesePhone('invalid')).toBeNull();
});
```

Thay import cũ để không khai báo `normalizeVietnamesePhone` hai lần.

- [ ] **Step 2: Chạy test và xác nhận RED**

```powershell
Set-Location 'D:\TechPhone Store\backend'
npx.cmd jest tests/phone-normalization.test.js --runInBand
```

Expected: FAIL vì `toE164VietnamesePhone` chưa tồn tại.

- [ ] **Step 3: Thêm E.164 converter**

Trong `backend/src/utils/phone.js`, thêm:

```js
const toE164VietnamesePhone = (value) => {
  const phone = normalizeVietnamesePhone(value);
  return phone ? `+84${phone.slice(1)}` : null;
};
```

Và export:

```js
module.exports = {
  VIETNAMESE_MOBILE_PATTERN,
  maskPhone,
  normalizeVietnamesePhone,
  toE164VietnamesePhone,
};
```

- [ ] **Step 4: Chạy test E.164 và xác nhận GREEN**

```powershell
npx.cmd jest tests/phone-normalization.test.js --runInBand
```

Expected: suite PASS.

- [ ] **Step 5: Thêm config Twilio**

Trong object export của `backend/src/config/env.js`, thêm:

```js
twilio: {
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
},
```

Thêm cuối `backend/.env.example`:

```dotenv

# Optional Twilio Verify Trial for SMS OTP
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

- [ ] **Step 6: Viết provider tests trước implementation**

Thêm vào `backend/tests/otp-delivery-service.test.js`:

```js
it('starts and checks a Twilio Verify challenge in production', async () => {
  const calls = [];
  const fetcher = jest.fn(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/Verifications')) {
      return { ok: true, json: async () => ({ sid: 'VE123', status: 'pending' }) };
    }
    return { ok: true, json: async () => ({ status: 'approved' }) };
  });
  const service = new OtpDeliveryService({
    config: {
      nodeEnv: 'production',
      twilio: {
        accountSid: 'AC123',
        authToken: 'secret-token',
        verifyServiceSid: 'VA123',
      },
    },
    fetcher,
  });

  await expect(service.send('sms', '0912345678')).resolves.toMatchObject({
    deliveryTarget: '091***678',
    trackingId: 'VE123',
  });
  await expect(service.verify('0912345678', '654321')).resolves.toBe(true);
  expect(calls[0].url).toContain('/Services/VA123/Verifications');
  expect(String(calls[0].options.body)).toContain('To=%2B84912345678');
  expect(calls[0].options.headers.Authorization).toMatch(/^Basic /);
});
```

- [ ] **Step 7: Chạy provider test và xác nhận RED**

```powershell
npx.cmd jest tests/otp-delivery-service.test.js --runInBand
```

Expected: FAIL vì constructor/provider verification chưa được triển khai.

- [ ] **Step 8: Thay `otpDeliveryService.js` bằng implementation Twilio Verify**

```js
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { maskPhone, toE164VietnamesePhone } = require('../utils/phone');

class OtpDeliveryService {
  constructor({ config = env, fetcher = globalThis.fetch } = {}) {
    this.config = config;
    this.fetcher = fetcher;
  }

  isTwilioVerifyConfigured() {
    const twilio = this.config.twilio || {};
    return Boolean(twilio.accountSid && twilio.authToken && twilio.verifyServiceSid);
  }

  usesProviderVerification() {
    return this.config.nodeEnv === 'production' && this.isTwilioVerifyConfigured();
  }

  async twilioVerifyRequest(resource, params) {
    const { accountSid, authToken, verifyServiceSid } = this.config.twilio;
    const authorization = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await this.fetcher(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifyServiceSid)}/${resource}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorization}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params),
        signal: AbortSignal.timeout(8000),
      },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AppError(payload.message || 'Không thể kết nối dịch vụ xác thực SMS', 502);
    }
    return payload;
  }

  async sms(target) {
    if (this.config.nodeEnv !== 'production') {
      return { deliveryTarget: maskPhone(target), trackingId: null };
    }
    if (!this.isTwilioVerifyConfigured()) {
      throw new AppError('Dịch vụ SMS thật chưa được cấu hình. Vui lòng thử lại sau.', 503);
    }
    const to = toE164VietnamesePhone(target);
    if (!to) throw new AppError('Số điện thoại Việt Nam không hợp lệ', 422);
    const result = await this.twilioVerifyRequest('Verifications', { To: to, Channel: 'sms' });
    return { deliveryTarget: maskPhone(target), trackingId: result.sid || null };
  }

  async verify(target, code) {
    if (!this.usesProviderVerification()) return null;
    const to = toE164VietnamesePhone(target);
    if (!to) return false;
    const result = await this.twilioVerifyRequest('VerificationCheck', { To: to, Code: code });
    return result.status === 'approved';
  }

  async send(channel, target) {
    if (channel !== 'sms') throw new AppError('Kênh nhận OTP không được hỗ trợ', 422);
    return this.sms(target);
  }
}

module.exports = new OtpDeliveryService();
module.exports.OtpDeliveryService = OtpDeliveryService;
```

- [ ] **Step 9: Cho AuthService kiểm tra mã bằng provider ở production**

Trong `backend/src/services/authService.js`, thay toàn bộ method `verifyOtp` bằng:

```js
async verifyOtp({ target, purpose, otp }) {
  const verification = await verificationCodeRepository.findActive(target, purpose);
  if (!verification || verification.attempts >= 5) {
    throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }

  let approved;
  if (otpDeliveryService.usesProviderVerification()) {
    approved = await otpDeliveryService.verify(target, otp);
  } else {
    const expected = Buffer.from(verification.codeHash, 'hex');
    const received = Buffer.from(this.otpHash(otp, target, purpose), 'hex');
    approved = expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  if (!approved) {
    await verificationCodeRepository.incrementAttempts(verification.id);
    throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  }
  const consumed = await verificationCodeRepository.consume(verification.id);
  if (!consumed) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn', 400);
  return verification;
}
```

Local/test vẫn dùng OTP được hash trong MongoDB; production có đủ ba Twilio env sẽ dùng Twilio Verify Check.

- [ ] **Step 10: Chạy toàn bộ backend tests**

```powershell
npm.cmd run test:coverage
```

Expected: tất cả tests PASS, bao gồm OTP local, one-time consumption và provider tests; coverage vẫn vượt threshold.

- [ ] **Step 11: Commit provider code nhưng chưa thêm secret**

```powershell
Set-Location 'D:\TechPhone Store'
git diff --check
git add -- backend/src/utils/phone.js backend/src/config/env.js backend/src/services/otpDeliveryService.js backend/src/services/authService.js backend/.env.example backend/tests/phone-normalization.test.js backend/tests/otp-delivery-service.test.js
git diff --cached --stat
git commit -m "feat: support Twilio Verify trial for phone OTP"
git push origin main
```

Expected: không có `.env` hoặc secret trong staged diff.

---

### Task 12: Timebox Twilio Trial và chốt nhánh OTP

**Files:**
- Dashboard-only secrets: Twilio and Vercel environment variables.
- Runtime endpoints: `/api/auth/register/request-otp`, `/api/auth/register/verify-otp`.

**Interfaces:**
- Consumes: Twilio Trial verified recipient và provider code từ Task 11.
- Produces: nhánh A SMS thật cho số demo hoặc nhánh B fallback có bằng chứng trung thực.

- [ ] **Step 1: Bắt đầu đồng hồ 90 phút**

Ghi giờ bắt đầu. Hết 90 phút phải chốt nhánh A hoặc B; không đăng ký thêm SMS provider khác.

- [ ] **Step 2: Tạo Twilio Trial không cần thẻ**

Mở `https://www.twilio.com/try-twilio`, đăng ký, xác minh email và số điện thoại Việt Nam của người trình bày. Không chọn Upgrade và không nhập payment method.

- [ ] **Step 3: Xác minh recipient thử nghiệm**

Trong Twilio Console tìm **Verified Caller IDs / Verified recipients** và bảo đảm số nhận OTP đã được verify. Trial chỉ gửi tới số đã xác minh.

- [ ] **Step 4: Tạo Verify Service**

Twilio Console → **Develop → Verify → Services → Create new**:

```text
Friendly name: TechPhone Demo
Default channel: SMS
Code length: 6
```

Ghi Verify Service SID bắt đầu `VA` vào password manager.

- [ ] **Step 5: Lấy credentials**

Twilio Console Dashboard:

- Account SID bắt đầu `AC`.
- Auth Token: bấm reveal rồi lưu trong password manager.
- Verify Service SID bắt đầu `VA`.

Không chụp màn hình Auth Token.

- [ ] **Step 6: Thêm ba env vào Vercel**

```text
TWILIO_ACCOUNT_SID = Account SID
TWILIO_AUTH_TOKEN = Auth Token
TWILIO_VERIFY_SERVICE_SID = Verify Service SID
```

Chọn đúng Production environment và redeploy backend.

- [ ] **Step 7: Kiểm tra request OTP production**

Dùng số đã được Twilio verify và chưa tồn tại trong collection `users`. Trên Netlify mở Register, nhập họ tên, số đó và mật khẩu demo mạnh, sau đó yêu cầu OTP.

Expected nhánh A: UI báo đã gửi, điện thoại nhận OTP và response production không chứa `debugOtp`.

- [ ] **Step 8A: Chốt nhánh A nếu SMS đến**

Nhập mã từ điện thoại.

Expected:

- đăng ký trả 201.
- user mới có `phoneVerified: true`.
- dùng lại cùng OTP bị từ chối.
- OTP sai bị từ chối.

Chụp SMS nhưng che số điện thoại giữa và che OTP; chụp UI đăng ký thành công.

- [ ] **Step 8B: Chốt nhánh B nếu SMS không đến hoặc Twilio từ chối**

Nếu hết 90 phút:

1. Chụp Twilio log/error và che SID/token/số điện thoại.
2. Xóa ba Twilio env khỏi Vercel nếu cấu hình không hoàn chỉnh.
3. Redeploy backend để hệ thống fail closed bằng 503 thay vì gửi giả.
4. Dùng tài khoản seed cho production demo.
5. Dùng ảnh backend test `otp-delivery-service.test.js` và `auth.test.js` làm bằng chứng OTP logic.
6. Ghi trong báo cáo: “SMS production bị giới hạn bởi Twilio Trial và quy định Sender ID Việt Nam; logic OTP đã hoàn thành và kiểm thử tự động, kênh thương mại cần nhà cung cấp trả phí/Brandname.”

Không bật development mode và không đưa `debugOtp` lên production.

- [ ] **Step 9: Kết thúc timebox**

Ghi rõ vào phiếu triển khai `OTP branch A` hoặc `OTP branch B`. Không để trạng thái mơ hồ.

---

### Task 13: Thanh toán zero-cost, smoke test và gói bằng chứng báo cáo

**Files:**
- Update documentation: `deployment.md`
- Update documentation: `docs/otp-configuration.md`
- Evidence outside Git: `D:\TechPhone-Evidence-2026-08-11`

**Interfaces:**
- Consumes: deployment URLs, OTP branch, Atlas data và test results.
- Produces: release evidence và kịch bản bảo vệ không nói quá khả năng hệ thống.

- [ ] **Step 1: Giữ COD là provider bắt buộc**

Không thêm thông tin tài khoản ngân hàng/MoMo cá nhân vào Vercel nếu không muốn công khai. Khi các env bank/MoMo để trống, `/api/payments/config` phải chỉ hiển thị provider đã cấu hình, tối thiểu COD.

- [ ] **Step 2: Không đăng ký VNPay mới trong hai ngày**

Nếu chưa có sẵn Sandbox TMN Code/Hash Secret, bỏ qua thao tác payment gateway và dùng test tự động hiện có làm bằng chứng. Không dùng giá trị giả trong Vercel env.

- [ ] **Step 3: Chạy smoke test production**

Đánh dấu PASS/FAIL từng dòng:

- [ ] Vercel `/api/health` trả 200.
- [ ] Vercel `/api/docs` mở được và server URL đúng.
- [ ] Netlify `/`, `/products`, `/accessories`, `/login`, `/admin` mở/refresh không 404.
- [ ] Frontend Network gọi domain Vercel và không CORS error.
- [ ] Admin seed login được.
- [ ] Customer seed login được.
- [ ] `TechPhone Demo 5G` còn tồn tại.
- [ ] Ảnh Cloudinary tải được trong Incognito.
- [ ] Thêm giỏ, voucher `TECH10` và phí ship tính được.
- [ ] COD tạo đúng một order.
- [ ] Order lookup đúng số điện thoại.
- [ ] Admin cập nhật trạng thái order.
- [ ] Không có `debugOtp` trong production response.
- [ ] OTP branch A hoặc branch B đã được ghi rõ.

- [ ] **Step 4: Chạy verification local cuối cùng**

```powershell
Set-Location 'D:\TechPhone Store\backend'
npm.cmd run test:coverage
npm.cmd audit --omit=dev
Set-Location 'D:\TechPhone Store\frontend'
npm.cmd run lint
npm.cmd run test:run
$env:VITE_USE_MOCK='false'
$env:VITE_API_URL=(Read-Host 'Paste Vercel URL with /api')
$env:VITE_SITE_URL=(Read-Host 'Paste Netlify URL')
npm.cmd run build
npm.cmd audit --omit=dev
Remove-Item Env:VITE_USE_MOCK
Remove-Item Env:VITE_API_URL
Remove-Item Env:VITE_SITE_URL
```

Expected: tests/lint/build PASS; backend production audit 0. Với frontend, advisory build-time chưa có fix phải được ghi rõ nếu còn xuất hiện; không chạy force fix.

- [ ] **Step 5: Kiểm tra metadata production build**

```powershell
Set-Location 'D:\TechPhone Store\frontend'
Get-Content dist\robots.txt
Get-Content dist\sitemap.xml | Select-Object -First 5
Select-String -Path dist\index.html -Pattern 'canonical'
```

Expected: Netlify URL thật xuất hiện trong robots, sitemap và canonical.

- [ ] **Step 6: Hoàn nguyên chỉ metadata nguồn do local production build tạo**

```powershell
Set-Location 'D:\TechPhone Store'
git diff -- frontend/public/robots.txt frontend/public/sitemap.xml
```

Chỉ khi diff đúng là thay localhost bằng Netlify URL do lệnh build vừa tạo, chạy:

```powershell
git restore -- frontend/public/robots.txt frontend/public/sitemap.xml
```

Không restore bất kỳ file nào khác.

- [ ] **Step 7: Cập nhật tài liệu không mâu thuẫn**

Trong `deployment.md` ghi đúng:

```text
Backend: Vercel, Root Directory backend
Frontend: Netlify, Base Directory frontend, Build npm run build, Publish dist
Database: MongoDB Atlas Free
Images: Cloudinary unsigned preset for course demo
OTP: Twilio Trial branch A hoặc documented fallback branch B
Payment: COD operational; bank/MoMo manual; VNPay Sandbox optional
```

Trong `docs/otp-configuration.md`, xóa hướng dẫn email/Brevo không còn đúng và mô tả chính xác nhánh OTP đã chốt.

- [ ] **Step 8: Chụp bộ ảnh báo cáo cuối**

Lưu tối thiểu:

1. GitHub Actions PASS.
2. Vercel deployment Ready.
3. `/api/health` và Swagger.
4. Netlify deployment Published.
5. Trang chủ production.
6. Admin dashboard.
7. Form thêm sản phẩm.
8. Sản phẩm trên trang khách.
9. Cloudinary Media Library chứa ảnh demo.
10. Atlas collection chứa sản phẩm.
11. Checkout COD.
12. Order success và order lookup.
13. Admin cập nhật đơn.
14. Backend coverage PASS.
15. Frontend tests/build PASS.
16. SMS đã che thông tin nếu branch A, hoặc Twilio error + OTP test PASS nếu branch B.

- [ ] **Step 9: Viết kịch bản trình bày 5–7 phút**

```text
1. Kiến trúc Netlify → Vercel → Atlas → Cloudinary.
2. Đăng nhập admin và thêm TechPhone Demo 5G.
3. Mở trang khách để chứng minh đồng bộ dữ liệu thật.
4. Đặt đơn COD và tra cứu đơn.
5. Cập nhật trạng thái trong admin.
6. Trình bày OTP branch A hoặc giới hạn branch B trung thực.
7. Trình bày test coverage và các giới hạn thanh toán.
```

- [ ] **Step 10: Commit tài liệu cuối và kiểm tra secret**

```powershell
Set-Location 'D:\TechPhone Store'
git grep -n -E 'mongodb\+srv://[^[:space:]]+@|AC[0-9a-fA-F]{32}|SK[0-9a-fA-F]{32}|VA[0-9a-fA-F]{32}'
git diff --check
git status --short
git add -- deployment.md docs/otp-configuration.md docs/deployment/2026-08-10-two-day-zero-cost-deployment-runbook.md
git diff --cached
git commit -m "docs: finalize zero-cost deployment runbook"
git push origin main
```

Expected: secret scan không tìm thấy credential thật. Sau `git diff --cached`, đọc toàn bộ các dòng env và xác nhận chỉ có tên biến hoặc mô tả, không có giá trị lấy từ password manager; GitHub Actions PASS trên commit cuối.

---

## Xử lý lỗi nhanh

### Vercel health 500 hoặc timeout

1. Mở Vercel Project → Logs.
2. Nếu có `MongoServerSelectionError`, kiểm tra Atlas `0.0.0.0/0`, username/password và database name.
3. Nếu có lỗi JWT secret, tạo lại secret tối thiểu 32 ký tự và redeploy.
4. Nếu báo MongoDB không hỗ trợ transaction, xác minh đang dùng Atlas cluster chứ không phải standalone Mongo local.

### Netlify build fail

Kiểm tra đúng ba giá trị:

```text
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

Kiểm tra Node version đáp ứng `>=22.12 <23` và Netlify env có `VITE_API_URL` khi `VITE_USE_MOCK=false`.

### Frontend báo CORS

1. Copy chính xác Netlify production URL, không có slash cuối.
2. Cập nhật Vercel `FRONTEND_URL`.
3. Redeploy Vercel.
4. Không dùng Netlify deploy-preview URL để test CORS production.

### Login seed thất bại

1. Xác minh dùng số `0900000000` hoặc `0911111111`.
2. Dùng đúng production `SEED_DEMO_PASSWORD`, không dùng `123456`.
3. Atlas phải có document `user-admin`/`user-customer` với `phoneVerified: true`.
4. Nếu đã chạy seed lại bằng password khác, password mới thay thế password cũ.

### Upload Cloudinary thất bại

1. Xác minh preset là Unsigned.
2. Xác minh cloud name không phải API key.
3. Xác minh file thuộc JPG/JPEG/PNG/WebP và dưới 5 MB.
4. Redeploy Netlify sau khi thêm env.
5. Mở DevTools Network và xem response từ `api.cloudinary.com`; không chụp toàn bộ request nếu có thông tin nhạy cảm.

### Twilio không gửi SMS Việt Nam

1. Xác minh recipient đã verify và số gửi ở định dạng `+84`.
2. Xem Twilio Verify Logs.
3. Không vượt timebox 90 phút.
4. Chuyển Task 12 Step 8B; đây là fallback hợp lệ đã duyệt, không phải thất bại của toàn bộ deploy.

### Seed chạy nhầm hoặc cần khôi phục

Seed không có undo. Nếu cluster demo bị seed nhầm, chạy seed lại sẽ đưa dữ liệu về bộ demo chuẩn. Không chạy seed trên database chứa dữ liệu người dùng cần giữ.

---

## Definition of Done

Deployment được coi là hoàn thành khi:

- [ ] Ngày 1 có đủ sáu điều kiện PASS của Task 10.
- [ ] Ngày 2 đã chốt rõ OTP branch A hoặc B.
- [ ] Toàn bộ smoke test bắt buộc của Task 13 PASS.
- [ ] GitHub Actions PASS trên commit cuối.
- [ ] Không có secret trong repository hoặc ảnh báo cáo.
- [ ] Có đủ bộ ảnh bằng chứng và kịch bản trình bày.
- [ ] Báo cáo mô tả đúng giới hạn: COD hoạt động, bank/MoMo thủ công, VNPay Sandbox tùy chọn, Twilio Trial có giới hạn.

## Nguồn chính thức

- MongoDB Atlas Node.js quick start: https://www.mongodb.com/docs/drivers/node/current/get-started/
- MongoDB Atlas connect requirements: https://www.mongodb.com/docs/atlas/connect-to-database-deployment/
- Vercel Express: https://vercel.com/docs/frameworks/backend/express
- Vercel monorepos: https://vercel.com/docs/monorepos
- Netlify Vite: https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/
- Cloudinary upload presets: https://cloudinary.com/documentation/upload_presets
- Cloudinary unsigned upload: https://cloudinary.com/documentation/upload_images
- Twilio Trial: https://www.twilio.com/docs/usage/trials
- Twilio Verify: https://www.twilio.com/docs/verify/api/verification
- Twilio Vietnam SMS guidelines: https://www.twilio.com/en-us/guidelines/vn/sms
