# Deploy đồ án TechPhone Store bằng Netlify + Vercel

> Cập nhật: 29/07/2026  
> Mục tiêu: đưa đồ án lên Internet để giảng viên và bạn học có thể xem, không dùng cho bán hàng thật.  
> Chi phí mục tiêu: 0 đồng.  
> Kiến trúc: Netlify Free + Vercel Hobby + MongoDB Atlas M0.

## 1. Kết quả sau khi hoàn thành

Bạn sẽ có ba địa chỉ:

```text
Frontend:
https://TEN-DU-AN.netlify.app

Backend:
https://TEN-BACKEND.vercel.app

Database:
MongoDB Atlas M0
```

Luồng hoạt động:

```text
Trình duyệt
    |
    v
Netlify: React/Vite frontend
    |
    | HTTPS, /api
    v
Vercel: Node.js/Express backend
    |
    v
MongoDB Atlas M0
```

Phân chia:

| Thành phần | Nền tảng | Chi phí |
|---|---|---:|
| Frontend React/Vite | Netlify Free | 0 đồng |
| Backend Express | Vercel Hobby | 0 đồng cho đồ án phi thương mại |
| Database | MongoDB Atlas M0 | 0 đồng |
| Domain | Dùng `netlify.app` và `vercel.app` | 0 đồng |
| Ảnh sản phẩm mẫu | `placehold.co` trong seed | 0 đồng |
| VNPay | Để trống hoặc dùng Sandbox | 0 đồng |
| OTP | Có thể bỏ qua và dùng tài khoản seed | 0 đồng |

Tài liệu chính thức:

- [Netlify Vite](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Netlify SPA rewrite](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/)
- [Netlify pricing](https://www.netlify.com/pricing/)
- [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Vercel Functions runtime](https://vercel.com/docs/functions/runtimes)
- [Vercel Hobby terms](https://vercel.com/legal/terms)
- [MongoDB Atlas M0](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)

## 2. Hạn chế cần biết trước

Đây là bản demo môn học, không phải production.

### 2.1. Upload ảnh không lưu lâu dài trên Vercel

Backend hiện ghi ảnh vào:

```text
backend/uploads
```

Vercel Functions không có ổ đĩa persistent. Filesystem của Function là read-only, chỉ có `/tmp` dùng tạm. Ngoài ra, Vercel không phục vụ `express.static()` như Express server thông thường.

Vì vậy:

- sản phẩm đã seed vẫn có ảnh vì dùng URL `placehold.co`;
- không nên demo upload avatar, ảnh sản phẩm, banner hoặc review;
- file upload có thể lỗi hoặc mất sau Function invocation/deployment;
- nếu giảng viên bắt buộc test upload, cần chuyển upload sang Cloudinary.

Phương án trong tài liệu này:

```text
Không demo upload ảnh.
Dùng toàn bộ ảnh URL đã có trong seed.
```

### 2.2. Không cần VNPay thật

Để trống:

```env
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
```

Frontend sẽ tự ẩn VNPay.

Nếu cần trình bày tích hợp thanh toán, chỉ dùng VNPay Sandbox.

### 2.3. Không cần SMTP nếu dùng tài khoản demo

Seed đã tạo sẵn tài khoản đăng nhập nên không cần đăng ký bằng OTP.

Tài khoản demo:

```text
Admin
Email: admin@gmail.com
Mật khẩu: 123456

Khách hàng
Email: user@gmail.com
Mật khẩu: 123456
```

Không dùng các tài khoản/mật khẩu này cho website thật.

## 3. Những tài khoản cần chuẩn bị

- [ ] GitHub chứa repo `TrungNguyen410/TechPhone-Store`.
- [ ] Netlify.
- [ ] Vercel.
- [ ] MongoDB Atlas.

Không cần:

- mua domain;
- Railway;
- VPS;
- thẻ thanh toán nếu các dịch vụ không yêu cầu xác minh;
- VNPay Production;
- Brevo;
- Twilio.

## 4. Kiểm tra repo trước khi deploy

Mở PowerShell:

```powershell
cd "D:\TechPhone Store"
```

Kiểm tra Git:

```powershell
git status
git branch --show-current
git remote -v
```

Remote đúng:

```text
https://github.com/TrungNguyen410/TechPhone-Store.git
```

Vercel và Netlify chỉ nhận code đã được commit và push lên GitHub.

### 4.1. Test backend

```powershell
cd "D:\TechPhone Store\backend"
npm ci
npm test
```

Yêu cầu:

- exit code `0`;
- không có test failed.

### 4.2. Test frontend

```powershell
cd "D:\TechPhone Store\frontend"
npm ci
npm run lint
npm run test:run
npm run build
```

Yêu cầu:

- lint không có error;
- test không failed;
- build thành công;
- có thư mục `frontend/dist`.

## 5. Hai thay đổi nên làm trước khi deploy

### 5.1. Thêm Netlify SPA rewrite

Tạo file:

```text
frontend/public/_redirects
```

Nội dung:

```text
/* /index.html 200
```

File này giúp refresh các route React không bị 404, ví dụ:

```text
/products
/products/phone-1
/cart
/admin
/payment-result
```

Sau khi build, file phải xuất hiện tại:

```text
frontend/dist/_redirects
```

Kiểm tra:

```powershell
cd "D:\TechPhone Store\frontend"
npm run build
Test-Path ".\dist\_redirects"
```

Kết quả phải là:

```text
True
```

### 5.2. Thêm trust proxy cho backend

Mở:

```text
backend/src/app.js
```

Ngay sau:

```js
const app = express();
```

thêm:

```js
app.set('trust proxy', 1);
```

Việc này giúp Express hiểu request HTTPS và địa chỉ IP sau reverse proxy.

Chạy lại test:

```powershell
cd "D:\TechPhone Store\backend"
npm test
```

### 5.3. Commit và push

Sau khi hai thay đổi trên và test đã đạt:

```powershell
cd "D:\TechPhone Store"
git status
git add frontend/public/_redirects backend/src/app.js
git commit -m "chore: prepare Netlify and Vercel deployment"
git push origin devnguyen
```

Nếu deploy từ `main`, tạo/merge Pull Request vào `main` trước khi kết nối Netlify và Vercel.

Không dùng `git add .` nếu trong repo có các thay đổi không liên quan mà bạn chưa kiểm tra.

**Điều kiện hoàn thành:** `_redirects` tồn tại, backend có `trust proxy`, test xanh và code đã push.

## 6. Tạo MongoDB Atlas M0

### 6.1. Tạo project

1. Mở [MongoDB Atlas](https://cloud.mongodb.com).
2. Đăng ký hoặc đăng nhập.
3. Chọn **New Project**.
4. Project Name:

   ```text
   techphone-school-project
   ```

5. Chọn **Create Project**.

### 6.2. Tạo M0 cluster

1. Vào **Database** hoặc **Database Deployments**.
2. Chọn **Build a Database** hoặc **Create**.
3. Chọn gói **Free/M0**.
4. Chọn provider bất kỳ có M0.
5. Chọn region gần Việt Nam, ưu tiên Singapore nếu có.
6. Cluster Name:

   ```text
   techphone-demo
   ```

7. Chọn **Create Deployment**.
8. Chờ cluster khởi tạo xong.

### 6.3. Tạo database user

1. Vào **Security → Database Access**.
2. Chọn **Add New Database User**.
3. Authentication Method: **Password**.
4. Username:

   ```text
   techphone_app
   ```

5. Tạo mật khẩu mạnh và lưu vào password manager.
6. Với đồ án, có thể chọn role **Read and write to any database**.
7. Chọn **Add User**.

Không dùng mật khẩu `123456` cho database.

### 6.4. Cho phép Vercel truy cập

Vercel Functions không có một IP đơn giản để dùng cho cấu hình miễn phí này.

1. Vào **Security → Network Access**.
2. Chọn **Add IP Address**.
3. Chọn **Allow Access from Anywhere**.
4. Kiểm tra giá trị:

   ```text
   0.0.0.0/0
   ```

5. Ghi chú:

   ```text
   Vercel school demo
   ```

6. Chọn **Confirm**.

Đây là lựa chọn tiện cho demo. Database vẫn được bảo vệ bằng username/password.

### 6.5. Lấy Mongo URI

1. Vào **Database Deployments**.
2. Chọn **Connect**.
3. Chọn **Drivers**.
4. Driver chọn Node.js.
5. Sao chép connection string.

Chuỗi ban đầu:

```text
mongodb+srv://techphone_app:<db_password>@techphone-demo.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Thay:

- `<db_password>` bằng mật khẩu database;
- thêm database name `techphone_store`.

Kết quả:

```text
mongodb+srv://techphone_app:MAT_KHAU@techphone-demo.xxxxx.mongodb.net/techphone_store?retryWrites=true&w=majority
```

Nếu mật khẩu chứa ký tự đặc biệt, URL-encode mật khẩu:

```powershell
node -e "console.log(encodeURIComponent(process.argv[1]))" "MAT_KHAU"
```

Không commit Mongo URI vào GitHub.

**Điều kiện hoàn thành:** có cluster M0, database user, Network Access và Mongo URI.

## 7. Seed dữ liệu demo lên Atlas

Seed hiện sẽ:

- xóa dữ liệu cũ trong database đã chọn;
- tạo sản phẩm, phụ kiện, banner, voucher;
- tạo tài khoản demo;
- tạo đơn hàng, review và liên hệ mẫu.

Chỉ chạy trên database đồ án.

### 7.1. Cách 1: đặt biến tạm trong PowerShell

```powershell
cd "D:\TechPhone Store\backend"
$env:MONGO_URI="mongodb+srv://techphone_app:MAT_KHAU@techphone-demo.xxxxx.mongodb.net/techphone_store?retryWrites=true&w=majority"
npm run seed
Remove-Item Env:MONGO_URI
```

`Remove-Item Env:MONGO_URI` chỉ xóa biến khỏi PowerShell hiện tại, không xóa database.

### 7.2. Kết quả mong đợi

Terminal phải thông báo seed thành công.

Kiểm tra trong Atlas:

1. mở **Browse Collections**;
2. chọn database `techphone_store`;
3. kiểm tra các collection như:

   ```text
   users
   products
   accessories
   orders
   reviews
   vouchers
   ```

### 7.3. Test backend local với Atlas

Tạo `backend/.env` local nếu chưa có:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=MONGODB_URI_CUA_BAN
JWT_ACCESS_SECRET=local-access-secret-for-school-demo
JWT_REFRESH_SECRET=local-refresh-secret-for-school-demo
FRONTEND_URL=http://localhost:5173
PUBLIC_SITE_URL=http://localhost:5173
```

Không commit `backend/.env`.

Chạy:

```powershell
cd "D:\TechPhone Store\backend"
npm start
```

Mở:

```text
http://localhost:5000/api/health
http://localhost:5000/api/products
```

**Điều kiện hoàn thành:** Atlas có dữ liệu seed và backend local đọc được sản phẩm.

## 8. Tạo frontend Netlify lần đầu

Ta tạo Netlify trước để lấy URL frontend. Lần deploy đầu có thể chưa gọi được backend.

### 8.1. Import GitHub repo

1. Mở [Netlify](https://app.netlify.com).
2. Đăng nhập bằng GitHub.
3. Chọn **Add new project** hoặc **Add new site**.
4. Chọn **Import an existing project**.
5. Chọn GitHub.
6. Cấp quyền cho repo cần thiết.
7. Chọn:

   ```text
   TrungNguyen410/TechPhone-Store
   ```

### 8.2. Build settings

Nếu Netlify có riêng trường Base directory:

```text
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

Nếu không dùng Base directory:

```text
Build command: npm --prefix frontend run build
Publish directory: frontend/dist
```

Không trộn hai cách.

Khuyến nghị dùng:

```text
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

### 8.3. Environment Variables lần đầu

Thêm:

```env
NODE_VERSION=24
VITE_USE_MOCK=false
VITE_API_URL=https://placeholder.invalid/api
VITE_GA_MEASUREMENT_ID=
```

`placeholder.invalid` chỉ dùng trong deployment đầu để lấy URL Netlify. Ta sẽ thay bằng Vercel URL ở bước 11.

### 8.4. Deploy

1. Chọn **Deploy**.
2. Chờ build kết thúc.
3. Nếu thành công, Netlify cấp URL dạng:

   ```text
   https://random-name-123.netlify.app
   ```

4. Vào **Domain management** hoặc **Project configuration** để đổi site name, ví dụ:

   ```text
   techphone-store-demo
   ```

5. URL frontend cuối cùng có thể là:

   ```text
   https://techphone-store-demo.netlify.app
   ```

Ghi lại chính xác URL này, không thêm dấu `/` cuối.

Frontend lúc này mở được nhưng API chưa hoạt động vì vẫn dùng `placeholder.invalid`.

### 8.5. Nếu build lỗi

Mở **Deploys → Failed deploy → Deploy log**.

Kiểm tra:

- Base directory có đúng `frontend`;
- Publish directory có đúng `dist`;
- build command là `npm run build`;
- branch deploy có code mới nhất;
- `_redirects` đã được push.

**Điều kiện hoàn thành:** có URL `*.netlify.app` và frontend build thành công.

## 9. Tạo JWT secret cho Vercel

Chạy lệnh sau hai lần:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Lưu:

```text
Lần 1 → JWT_ACCESS_SECRET
Lần 2 → JWT_REFRESH_SECRET
```

Hai secret:

- phải khác nhau;
- không gửi qua chat;
- không commit vào repo;
- không dùng chuỗi ví dụ trong tài liệu.

## 10. Deploy backend Express lên Vercel

### 10.1. Import repo

1. Mở [Vercel](https://vercel.com).
2. Đăng nhập bằng GitHub.
3. Chọn **Add New → Project**.
4. Import:

   ```text
   TrungNguyen410/TechPhone-Store
   ```

5. Project Name:

   ```text
   techphone-api-demo
   ```

6. Framework Preset:

   ```text
   Other
   ```

7. Root Directory:

   ```text
   backend
   ```

Vercel hỗ trợ Express và nhận file `server.js` trong backend.

### 10.2. Thêm Environment Variables

Thêm cho Production, Preview và Development nếu giao diện cho chọn:

```env
NODE_ENV=production
MONGO_URI=MONGODB_URI_DA_TAO
JWT_ACCESS_SECRET=SECRET_LAN_1
JWT_REFRESH_SECRET=SECRET_LAN_2
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://TEN-DU-AN.netlify.app
PUBLIC_SITE_URL=https://TEN-DU-AN.netlify.app
UPLOAD_DIR=uploads
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://TEN-BACKEND.vercel.app/api/payments/vnpay/return
VNPAY_VERSION=2.1.0
```

Trong lần deploy đầu chưa biết chính xác Vercel URL. Có thể:

- tạm để trống `VNPAY_RETURN_URL` nếu không dùng VNPay; hoặc
- cập nhật sau khi Vercel cấp URL.

Không tạo biến `PORT`. Vercel quản lý runtime.

Điểm quan trọng:

```env
FRONTEND_URL=https://techphone-store-demo.netlify.app
```

Phải chính xác:

- có `https://`;
- không có dấu `/` cuối;
- đúng site Netlify;
- không dùng URL deploy preview.

### 10.3. Deploy

1. Chọn **Deploy**.
2. Chờ build.
3. Khi thành công, ghi lại URL:

   ```text
   https://techphone-api-demo.vercel.app
   ```

### 10.4. Kiểm tra backend

Mở:

```text
https://techphone-api-demo.vercel.app/api/health
```

Kết quả mong đợi:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

Tiếp tục mở:

```text
https://techphone-api-demo.vercel.app/api/products
https://techphone-api-demo.vercel.app/api/payments/config
https://techphone-api-demo.vercel.app/api/docs
```

`payments/config` phải cho thấy VNPay disabled nếu chưa có key.

### 10.5. Cập nhật VNPay Return URL

Nếu dùng VNPay Sandbox, Vercel → Project → Settings → Environment Variables:

```env
VNPAY_RETURN_URL=https://techphone-api-demo.vercel.app/api/payments/vnpay/return
```

Redeploy backend.

Nếu không dùng VNPay thì bỏ qua.

### 10.6. Nếu deployment lỗi

Mở:

```text
Vercel Project → Deployments → deployment lỗi → Logs
```

Các lỗi thường gặp:

#### JWT secret

```text
JWT_ACCESS_SECRET must be a strong...
```

Cách sửa:

- tạo secret mới bằng lệnh ở bước 9;
- kiểm tra secret dài hơn 32 ký tự;
- không dùng `change-me`, `example` hoặc placeholder.

#### Mongo authentication

```text
bad auth
authentication failed
```

Cách sửa:

- kiểm tra database username;
- kiểm tra password;
- URL-encode password;
- kiểm tra `MONGO_URI` có database `techphone_store`.

#### Mongo timeout

```text
Server selection timed out
```

Cách sửa:

- Atlas → Network Access;
- kiểm tra có `0.0.0.0/0`;
- chờ Network Access chuyển active.

#### Không tìm thấy backend

Kiểm tra:

- Root Directory là `backend`;
- repo/branch chứa `backend/server.js`;
- `backend/package.json` có script `start`;
- không chọn preset Vite/React cho backend.

**Điều kiện hoàn thành:** `/api/health` và `/api/products` hoạt động trên Vercel.

## 11. Nối Netlify frontend với Vercel backend

### 11.1. Đổi Netlify Environment Variable

Netlify → Project → **Project configuration → Environment variables**.

Đổi:

```env
VITE_API_URL=https://techphone-api-demo.vercel.app/api
VITE_USE_MOCK=false
NODE_VERSION=24
```

Không nhập:

```text
https://techphone-api-demo.vercel.app
```

vì thiếu `/api`.

Không nhập:

```text
https://techphone-api-demo.vercel.app/api/
```

Khuyến nghị không có dấu `/` cuối.

### 11.2. Redeploy frontend

1. Netlify → **Deploys**.
2. Chọn **Trigger deploy**.
3. Chọn **Deploy site** hoặc **Clear cache and deploy site**.
4. Chờ deployment thành công.

Vì `VITE_*` được đóng vào bundle khi build, chỉ đổi variable mà không redeploy sẽ chưa có tác dụng.

### 11.3. Kiểm tra request

1. Mở frontend Netlify.
2. Nhấn `F12`.
3. Chọn tab **Network**.
4. Reload trang.
5. Tìm request `/products`.
6. Request URL phải bắt đầu bằng:

   ```text
   https://techphone-api-demo.vercel.app/api
   ```

Không được gọi:

```text
http://localhost:5000
https://placeholder.invalid
```

### 11.4. Nếu gặp lỗi CORS

Console có thể báo:

```text
blocked by CORS policy
```

Kiểm tra Vercel Environment Variable:

```env
FRONTEND_URL=https://techphone-store-demo.netlify.app
```

So sánh chính xác với URL đang mở.

Sau khi sửa:

1. redeploy Vercel backend;
2. mở lại Netlify;
3. hard refresh bằng `Ctrl + F5`.

**Điều kiện hoàn thành:** frontend hiển thị sản phẩm lấy từ Atlas và không có lỗi CORS.

## 12. Kiểm tra các chức năng để trình bày

### 12.1. Luồng khách hàng

Mở:

```text
https://TEN-DU-AN.netlify.app
```

Kiểm tra:

- [ ] Trang chủ tải được.
- [ ] Danh sách sản phẩm tải từ backend.
- [ ] Tìm kiếm sản phẩm.
- [ ] Lọc sản phẩm.
- [ ] Mở chi tiết sản phẩm.
- [ ] Thêm sản phẩm vào yêu thích.
- [ ] Thêm sản phẩm vào giỏ.
- [ ] Thay đổi số lượng.
- [ ] Xóa sản phẩm khỏi giỏ.
- [ ] Đăng nhập khách hàng.
- [ ] Tạo đơn COD demo.
- [ ] Xem đơn của tôi.
- [ ] Tra cứu đơn hàng.
- [ ] Gửi liên hệ.
- [ ] Xem chính sách.

Đăng nhập khách hàng:

```text
Email: user@gmail.com
Mật khẩu: 123456
```

### 12.2. Luồng admin

Mở:

```text
https://TEN-DU-AN.netlify.app/admin
```

Đăng nhập:

```text
Email: admin@gmail.com
Mật khẩu: 123456
```

Kiểm tra:

- [ ] Dashboard có số liệu.
- [ ] Danh sách khách hàng.
- [ ] Danh sách sản phẩm.
- [ ] Danh sách phụ kiện.
- [ ] Danh mục và thương hiệu.
- [ ] Danh sách đơn hàng.
- [ ] Cập nhật trạng thái đơn.
- [ ] Review.
- [ ] Voucher.
- [ ] Banner.
- [ ] Store Settings.

Không demo upload ảnh khi backend ở Vercel, trừ khi đã chuyển sang Cloudinary.

### 12.3. React Router

Mở trực tiếp rồi refresh:

```text
https://TEN-DU-AN.netlify.app/products
https://TEN-DU-AN.netlify.app/cart
https://TEN-DU-AN.netlify.app/admin
https://TEN-DU-AN.netlify.app/order-lookup
```

Nếu refresh bị Netlify 404:

- kiểm tra `frontend/public/_redirects`;
- kiểm tra `frontend/dist/_redirects`;
- push lại file;
- redeploy Netlify.

## 13. OTP và VNPay: chọn mức demo

### 13.1. Mức đơn giản, khuyến nghị

```text
OTP: không demo
VNPay: không demo
Thanh toán: COD
Đăng nhập: tài khoản seed
```

Không cần thêm biến SMTP/VNPay.

Đây là phương án ít lỗi nhất khi thuyết trình.

### 13.2. Nếu muốn demo OTP

Cần cấu hình Brevo SMTP:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=SMTP_LOGIN
SMTP_PASS=SMTP_KEY
SMTP_FROM=TechPhone <EMAIL_DA_XAC_MINH>
```

Sau khi thêm trên Vercel, redeploy và test:

- đăng ký;
- gửi lại OTP;
- quên mật khẩu;
- OTP sai;
- OTP hết hạn.

Nếu SMTP trên môi trường serverless gặp lỗi, chuyển sang API gửi email hoặc bỏ OTP khỏi phần trình diễn.

### 13.3. Nếu muốn demo VNPay

Chỉ dùng Sandbox:

```env
VNPAY_TMN_CODE=TMN_CODE_SANDBOX
VNPAY_HASH_SECRET=HASH_SECRET_SANDBOX
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://TEN-BACKEND.vercel.app/api/payments/vnpay/return
VNPAY_VERSION=2.1.0
```

IPN URL:

```text
https://TEN-BACKEND.vercel.app/api/payments/vnpay/ipn
```

Sau khi cấu hình:

1. redeploy Vercel;
2. mở `/api/payments/config`;
3. xác nhận VNPay enabled;
4. redeploy Netlify nếu frontend chưa cập nhật;
5. test tài khoản Sandbox;
6. không dùng tiền thật.

## 14. Cách cập nhật website sau này

Khi push commit mới lên branch production:

```powershell
cd "D:\TechPhone Store"
git status
git add DUONG_DAN_FILE_DA_SUA
git commit -m "noi dung thay doi"
git push origin TEN_BRANCH
```

Nếu Netlify và Vercel cùng theo dõi `main`:

- thay đổi trong frontend có thể kích hoạt cả hai project;
- thay đổi backend cũng có thể kích hoạt cả hai project;
- việc build thừa không nghiêm trọng với đồ án nhỏ;
- có thể cấu hình ignore/build filters sau nếu cần tiết kiệm lượt build.

Mỗi lần deploy:

1. kiểm tra Vercel `/api/health`;
2. kiểm tra Netlify trang chủ;
3. kiểm tra đăng nhập;
4. kiểm tra một API request;
5. kiểm tra route `/admin`.

## 15. Xử lý sự cố thường gặp

### Frontend trắng trang

Kiểm tra Netlify deploy log và Console browser.

Nguyên nhân thường gặp:

- build fail;
- sai Base directory;
- thiếu dependency;
- JavaScript runtime error.

### Frontend vẫn dùng mock

Kiểm tra:

```env
VITE_USE_MOCK=false
```

Sau đó redeploy Netlify.

### Frontend gọi localhost

Kiểm tra:

```env
VITE_API_URL=https://TEN-BACKEND.vercel.app/api
```

Redeploy Netlify.

### API trả 500

Mở Vercel runtime logs.

Kiểm tra:

- Mongo URI;
- JWT secret;
- Atlas Network Access;
- database đã seed;
- lỗi code.

### Đăng nhập thất bại

Kiểm tra:

- database đúng là `techphone_store`;
- seed đã chạy;
- collection `users` có `admin@gmail.com`;
- mật khẩu demo là `123456`;
- frontend gọi đúng Vercel URL.

### Sản phẩm không hiện

Mở trực tiếp:

```text
https://TEN-BACKEND.vercel.app/api/products
```

Nếu API rỗng:

- seed chưa chạy;
- seed chạy nhầm database;
- Vercel dùng Mongo URI khác máy local.

### Refresh `/admin` bị 404

Thêm:

```text
frontend/public/_redirects
```

với nội dung:

```text
/* /index.html 200
```

Redeploy Netlify.

### Upload ảnh lỗi

Đây là giới hạn dự kiến của phương án Vercel.

Giải pháp:

- không demo upload;
- dùng URL ảnh có sẵn;
- hoặc chuyển sang Cloudinary.

### Netlify dừng site

Netlify Free dùng giới hạn credits. Nếu hết credits, site có thể bị pause tới chu kỳ tiếp theo.

Với đồ án:

- không bật auto recharge;
- tránh redeploy liên tục;
- không chạy load test;
- chỉ chia sẻ link cho giảng viên và nhóm.

## 16. Kịch bản thuyết trình đề xuất

Chuẩn bị sẵn hai tab:

```text
Tab 1: frontend Netlify
Tab 2: backend /api/docs hoặc /api/health
```

Thứ tự demo:

1. Giới thiệu kiến trúc React + Express + MongoDB.
2. Mở trang chủ.
3. Tìm/lọc sản phẩm.
4. Mở chi tiết sản phẩm.
5. Thêm giỏ hàng.
6. Đăng nhập khách hàng.
7. Tạo đơn COD.
8. Đăng xuất.
9. Đăng nhập admin.
10. Mở dashboard.
11. Mở đơn vừa tạo.
12. Cập nhật trạng thái đơn.
13. Quay lại tài khoản khách và xem trạng thái.
14. Mở Swagger hoặc health endpoint.
15. Trình bày Netlify, Vercel và Atlas.

Không nên demo:

- upload ảnh nếu chưa dùng Cloudinary;
- email OTP nếu SMTP chưa test trước;
- VNPay nếu Sandbox chưa test trước;
- chức năng vừa sửa nhưng chưa deploy.

Trước giờ thuyết trình:

- đăng nhập thử cả hai tài khoản;
- tạo một đơn thử;
- mở Vercel để Function được warm;
- kiểm tra Atlas không bị pause;
- giữ sẵn link backend/frontend;
- chuẩn bị video hoặc ảnh chụp dự phòng.

## 17. Checklist hoàn thành

### Code

- [ ] Backend test xanh.
- [ ] Frontend lint/test/build xanh.
- [ ] Có `frontend/public/_redirects`.
- [ ] Có `app.set('trust proxy', 1)`.
- [ ] Code đã commit và push.

### Atlas

- [ ] Có M0 cluster.
- [ ] Có database user.
- [ ] Có Network Access.
- [ ] Mongo URI đúng.
- [ ] Seed chạy thành công.
- [ ] Có products và users.

### Vercel

- [ ] Root Directory là `backend`.
- [ ] Mongo URI đã nhập.
- [ ] Hai JWT secret đã nhập.
- [ ] `FRONTEND_URL` đúng URL Netlify.
- [ ] `/api/health` hoạt động.
- [ ] `/api/products` có dữ liệu.

### Netlify

- [ ] Base Directory là `frontend`.
- [ ] Build command là `npm run build`.
- [ ] Publish directory là `dist`.
- [ ] `VITE_USE_MOCK=false`.
- [ ] `VITE_API_URL` có `/api`.
- [ ] Deployment xanh.
- [ ] Refresh `/admin` không 404.

### Demo

- [ ] User đăng nhập được.
- [ ] Admin đăng nhập được.
- [ ] Tạo đơn COD được.
- [ ] Admin thấy đơn.
- [ ] Không demo upload chưa hỗ trợ.
- [ ] Có link và video/ảnh dự phòng.

## 18. Tóm tắt thứ tự thực hiện

```text
1. Test code
2. Thêm _redirects
3. Thêm trust proxy
4. Commit và push
5. Tạo Atlas M0
6. Chạy seed từ local
7. Tạo Netlify để lấy URL frontend
8. Tạo JWT secrets
9. Deploy backend Vercel
10. Test Vercel API
11. Điền Vercel URL vào Netlify
12. Redeploy Netlify
13. Test CORS và đăng nhập
14. Test user/admin/COD
15. Chuẩn bị kịch bản thuyết trình
```

## 19. Cấu hình cuối cùng mẫu

### Vercel backend

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER/techphone_store?retryWrites=true&w=majority
JWT_ACCESS_SECRET=SECRET_1_TOI_THIEU_32_KY_TU
JWT_REFRESH_SECRET=SECRET_2_TOI_THIEU_32_KY_TU
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://techphone-store-demo.netlify.app
PUBLIC_SITE_URL=https://techphone-store-demo.netlify.app
UPLOAD_DIR=uploads
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
```

### Netlify frontend

```env
NODE_VERSION=24
VITE_API_URL=https://techphone-api-demo.vercel.app/api
VITE_USE_MOCK=false
VITE_GA_MEASUREMENT_ID=
```

Thay toàn bộ URL và secret ví dụ bằng dữ liệu thật của project trước khi deploy.

