# Kiểm tra phần còn thiếu trước khi deploy và hướng dẫn bật OTP

> Ngày kiểm tra: 01/08/2026  
> Phạm vi: TechPhone Store, frontend Netlify, backend Vercel, MongoDB Atlas và OTP thật.  
> Mục tiêu: deploy đồ án môn học với chi phí thấp, ưu tiên luồng ổn định để trình bày.  
> Lưu ý: tài liệu này được lập từ mã nguồn và cấu hình local. Trạng thái tài khoản Netlify, Vercel, Atlas, Brevo và Twilio phải được kiểm tra trực tiếp trên dashboard của từng dịch vụ.

## 1. Kết luận nhanh

Phần nghiệp vụ chính của dự án đã hoàn thành và test đang xanh. Tuy nhiên, bản hiện tại **chưa nên bấm deploy Vercel ngay** vì còn thiếu entrypoint dành cho Vercel Functions và một số cấu hình production.

Trạng thái tại thời điểm kiểm tra:

| Hạng mục | Trạng thái | Kết luận |
|---|---|---|
| Backend test | 79/79 passed | Đạt |
| Frontend test | 123/123 passed | Đạt |
| Frontend lint/build | Passed | Đạt |
| Docker local | Có cấu hình replica set và persistent volume | Đạt cho local |
| Netlify SPA fallback | Đã có `frontend/public/_redirects` | Đạt |
| Vercel entrypoint | Chưa có `backend/api/index.js` | **Thiếu, cần làm trước deploy** |
| Vercel routing | Chưa có `backend/vercel.json` | **Thiếu, cần làm trước deploy** |
| Express proxy | Chưa có `app.set('trust proxy', 1)` | **Thiếu** |
| MongoDB production | Chưa thể xác minh Atlas từ repo | Cần tạo/kiểm tra trên Atlas |
| Email OTP thật | Local chưa có biến SMTP | **Chưa bật** |
| SMS OTP thật | Local chưa có biến Twilio | Chưa bật, không bắt buộc |
| OTP logic | Có hash, TTL 10 phút, giới hạn 5 lần sai, dùng một lần | Đã làm |
| Upload ảnh bền vững | Cloudinary chưa có trong local config | Chưa bật, tùy chọn |
| VNPay | Merchant key chưa có trong repo, tự ẩn khi thiếu | Chưa bật, tùy chọn |
| SEO production | Thiếu `VITE_SITE_URL` trong cấu hình deploy hiện tại | **Cần bổ sung** |
| Swagger production URL | Vẫn trỏ ví dụ Render/localhost | Cần sửa |
| GitHub production | PR #3 còn ở trạng thái draft, chưa merge `main` | **Cần merge nếu deploy từ `main`** |
| Tài liệu deploy | Runbook Vercel mới đang untracked; tài liệu cũ vẫn ghi Render | Cần commit và đồng bộ |

Kiến trúc nên dùng cho đồ án:

```text
Netlify Free: React/Vite frontend
        |
        v
Vercel Hobby: Express API
        |
        v
MongoDB Atlas Free/M0

OTP email: Brevo SMTP
Upload: Cloudinary unsigned preset (nếu cần demo)
Thanh toán: COD; VNPay Sandbox chỉ bật khi đã test
```

## 2. Những phần đã làm xong

### 2.1. Luồng OTP

Các phần sau đã có trong mã nguồn:

- tạo OTP ngẫu nhiên gồm 6 chữ số;
- không lưu OTP dạng rõ, chỉ lưu hash;
- mã có hạn 10 phút;
- tối đa 5 lần nhập sai;
- OTP chỉ được consume một lần, kể cả hai request gửi đồng thời;
- đăng ký chỉ tạo user sau khi xác minh email;
- user sau đăng ký có `emailVerified=true`;
- quên mật khẩu hỗ trợ email và SMS;
- đổi mật khẩu sẽ thu hồi refresh token cũ;
- production không trả `debugOtp` về trình duyệt;
- development và mock có OTP thử nghiệm để test.

File liên quan:

- `backend/src/services/authService.js`
- `backend/src/services/otpDeliveryService.js`
- `backend/src/models/VerificationCode.js`
- `backend/src/repositories/verificationCodeRepository.js`
- `backend/src/routes/authRoutes.js`
- `frontend/src/pages/Register.jsx`
- `frontend/src/pages/ForgotPassword.jsx`
- `backend/tests/auth.test.js`
- `frontend/src/mock/mockAuthOtp.test.js`

### 2.2. Những phần deploy đã có

- `frontend/public/_redirects` hỗ trợ refresh React Router trên Netlify;
- `frontend/.env.example` đã liệt kê API URL, site URL và Cloudinary;
- `backend/.env.example` đã liệt kê MongoDB, JWT, SMTP, Twilio, ngân hàng, MoMo và VNPay;
- Docker Compose dùng MongoDB single-node replica set, phù hợp với transaction của checkout;
- backend có `/api/health`, `/api/products`, `/api/payments/config` và `/api/docs`;
- VNPay, ngân hàng và MoMo tự ẩn khi thiếu cấu hình;
- frontend có thể upload trực tiếp lên Cloudinary thay vì ghi file vào Vercel.

## 3. Các việc bắt buộc phải xử lý trước deploy

## P0-1. Tạo entrypoint cho Vercel

### Vấn đề

Hiện tại `backend/server.js` kết nối MongoDB rồi gọi `app.listen()`. Cách này phù hợp với Docker hoặc một server chạy liên tục, nhưng repo chưa có Function entrypoint/routing theo cấu trúc Vercel.

Tài liệu Vercel hiện hành hướng dẫn Express project đặt handler trong thư mục `/api`, export Express app/handler và dùng rewrite để chuyển request vào Function.

### File cần tạo

```text
backend/api/index.js
```

Yêu cầu của file:

1. import Express app từ `../src/app`;
2. kết nối MongoDB trước khi xử lý request;
3. cache promise kết nối ở module scope để một cold start không mở lặp nhiều kết nối;
4. nếu kết nối lỗi thì reset promise để invocation sau có thể thử lại;
5. export handler cho Vercel;
6. không gọi `process.exit()` trong Function.

Mẫu triển khai đề xuất:

```js
const app = require('../src/app');
const { connectDB } = require('../src/config/database');

let connectionPromise;

const ensureDatabase = () => {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
};

module.exports = async (req, res) => {
  await ensureDatabase();
  return app(req, res);
};
```

`backend/server.js` vẫn giữ lại để chạy Docker/local.

### File cần tạo

```text
backend/vercel.json
```

Mẫu theo cấu trúc Function ở trên:

```json
{
  "version": 2,
  "rewrites": [
    { "source": "/(.*)", "destination": "/api" }
  ]
}
```

Sau khi thêm, phải test bằng Vercel CLI thay vì chỉ chạy `npm start`:

```powershell
cd "D:\TechPhone Store\backend"
npx vercel dev
```

Mở:

```text
http://localhost:3000/api/health
http://localhost:3000/api/products
```

Điều kiện đạt:

- không có 404 Function;
- không treo ở bước kết nối MongoDB;
- `/api/health` và `/api/products` trả HTTP 200;
- gọi liên tiếp nhiều lần không tạo lỗi connection.

Tài liệu tham khảo: [Vercel Express guide](https://examples.vercel.com/kb/guide/using-express-with-vercel).

## P0-2. Bật trust proxy cho Express

### File cần sửa

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

Lý do:

- Vercel đặt Express sau reverse proxy;
- rate limit và lấy IP thanh toán cần hiểu đúng forwarded IP;
- request HTTPS cần được nhận diện đúng.

Sau khi sửa:

```powershell
cd "D:\TechPhone Store\backend"
npm test
```

## P0-3. Merge code vào production branch

Trạng thái lúc kiểm tra:

- branch hiện tại: `devnguyen`;
- commit mới nhất: `727d6d8`;
- PR: `#3`;
- PR đang là draft;
- CI backend, frontend và Docker đều passed;
- `origin/main` chưa chứa commit Việt hóa lỗi.

Nếu Netlify/Vercel theo dõi `main`, thực hiện:

1. mở `https://github.com/TrungNguyen410/TechPhone-Store/pull/3`;
2. chọn **Ready for review**;
3. kiểm tra tất cả checks màu xanh;
4. chọn **Merge pull request**;
5. xác nhận commit xuất hiện trên `main`;
6. sau đó mới kết nối production deployment với `main`.

Không deploy production từ local branch chưa merge nếu mục tiêu là link ổn định cho giảng viên.

## P0-4. Tạo hoặc kiểm tra MongoDB Atlas

Checkout của dự án dùng multi-document transaction. MongoDB standalone không đủ; Atlas Free/M0 là replica set và phù hợp cho demo nhỏ.

Các bước:

1. tạo Atlas project;
2. tạo Free/M0 cluster ở region gần Vercel, ưu tiên Singapore nếu có;
3. tạo database user riêng, không dùng tài khoản Atlas;
4. cấp quyền đọc/ghi database;
5. thêm Network Access phù hợp;
6. lấy URI có database name `techphone_store`;
7. URL-encode password nếu có ký tự đặc biệt;
8. không commit URI.

Mẫu:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER/techphone_store?retryWrites=true&w=majority
```

Test từ local:

```powershell
cd "D:\TechPhone Store\backend"
$env:MONGO_URI="MONGODB_ATLAS_URI"
npm start
```

Sau khi thấy backend chạy:

```powershell
Remove-Item Env:MONGO_URI
```

Không dùng MongoDB standalone vì backend sẽ chủ động từ chối topology không hỗ trợ transaction.

Tài liệu tham khảo:

- [MongoDB Atlas Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)
- [MongoDB transactions](https://www.mongodb.com/docs/manual/core/transactions/)

## P0-5. Điền đúng biến môi trường production

### Vercel backend: bắt buộc

```env
NODE_ENV=production
MONGO_URI=MONGODB_ATLAS_URI
JWT_ACCESS_SECRET=RANDOM_SECRET_1_IT_NHAT_32_KY_TU
JWT_REFRESH_SECRET=RANDOM_SECRET_2_KHAC_SECRET_1
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://TEN-SITE.netlify.app
PUBLIC_SITE_URL=https://TEN-SITE.netlify.app
API_PUBLIC_URL=https://TEN-BACKEND.vercel.app
```

Tạo hai JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Hai kết quả phải khác nhau. Không chụp màn hình, gửi chat hoặc commit secret.

### Netlify frontend: bắt buộc

```env
NODE_VERSION=24
VITE_USE_MOCK=false
VITE_API_URL=https://TEN-BACKEND.vercel.app/api
VITE_SITE_URL=https://TEN-SITE.netlify.app
```

`VITE_SITE_URL` đang bị thiếu trong runbook deploy cũ. Nếu không điền, canonical URL, `robots.txt` và `sitemap.xml` sẽ chứa `http://localhost:5173`.

Sau mỗi lần đổi biến môi trường phải redeploy. Biến Vite được nhúng vào bundle tại build time; biến Vercel mới cũng chỉ áp dụng cho deployment mới.

Tài liệu tham khảo: [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 4. Hướng dẫn bật email OTP thật bằng Brevo

Đối với đồ án, nên bật **email OTP**, không cần bật SMS.

### 4.1. Tạo tài khoản và sender

1. tạo hoặc đăng nhập Brevo;
2. vào phần **Senders & IP** hoặc **Senders and domains**;
3. thêm email gửi, ví dụ `no-reply@ten-mien-cua-ban`;
4. xác minh sender theo email Brevo gửi;
5. nếu không có domain riêng, dùng sender email đã được Brevo cho phép;
6. không dùng địa chỉ chưa xác minh trong `SMTP_FROM`.

### 4.2. Tạo SMTP key

1. mở **SMTP & API**;
2. chọn tab **SMTP**;
3. lấy SMTP login;
4. tạo SMTP key mới;
5. lưu key một lần vào password manager;
6. không dùng API key thay cho SMTP key.

Brevo hỗ trợ port 587/2525 cho kết nối không dùng SSL trực tiếp và port 465 khi bật SSL/TLS.

### 4.3. Điền trên Vercel

Vercel → backend project → Settings → Environment Variables:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=BREVO_SMTP_LOGIN
SMTP_PASS=BREVO_SMTP_KEY
SMTP_FROM=TechPhone <EMAIL_SENDER_DA_XAC_MINH>
```

Chỉ điền SMTP ở backend Vercel. Không đưa SMTP key vào Netlify hoặc biến `VITE_*`.

Với đồ án, chỉ áp dụng SMTP cho **Production** để tránh Preview Deployment gửi email ngoài ý muốn.

Sau khi lưu biến:

1. redeploy backend;
2. mở Vercel runtime logs;
3. test đăng ký bằng email chưa tồn tại;
4. kiểm tra Inbox và Spam;
5. kiểm tra Brevo transactional logs nếu không nhận được email.

Tài liệu tham khảo: [Brevo SMTP relay](https://developers.brevo.com/docs/smtp-integration).

### 4.4. Test đầy đủ luồng đăng ký OTP

Trên frontend Netlify:

1. mở `/register`;
2. dùng một email chưa có trong database;
3. nhập họ tên, số điện thoại và mật khẩu;
4. chọn **Gửi mã xác minh**;
5. production không được hiện `Mã OTP thử nghiệm`;
6. email phải đến trong Inbox hoặc Spam;
7. nhập OTP 6 chữ số;
8. tài khoản được tạo;
9. đăng nhập bằng tài khoản vừa tạo;
10. trong Atlas, user phải có `emailVerified=true`.

Test lỗi:

- nhập OTP sai: nhận thông báo mã không hợp lệ;
- nhập sai 5 lần: mã không còn dùng được;
- dùng lại OTP đã thành công: bị từ chối;
- chờ quá 10 phút: mã hết hạn;
- gửi lại OTP: mã cũ không còn hiệu lực;
- dùng email đã đăng ký: nhận HTTP 409.

### 4.5. Test quên mật khẩu bằng email

1. mở `/forgot-password`;
2. chọn nhận qua email;
3. nhập email của user đã có;
4. nhận OTP;
5. nhập mật khẩu mới;
6. đăng nhập bằng mật khẩu mới;
7. refresh token cũ phải không dùng được.

### 4.6. Nếu OTP email lỗi

| Hiện tượng | Kiểm tra |
|---|---|
| API trả 503 | Thiếu `SMTP_HOST`, `SMTP_USER` hoặc `SMTP_PASS` |
| Authentication failed | `SMTP_PASS` không phải SMTP key hoặc login sai |
| Email không đến | Kiểm tra sender verification, Spam và Brevo logs |
| From bị từ chối | `SMTP_FROM` chưa xác minh |
| Function timeout | Kiểm tra port, secure mode và Vercel logs |
| Local có `debugOtp`, production không có | Đây là hành vi đúng |

## 5. SMS OTP: chỉ bật nếu thật sự cần

Mã nguồn đã hỗ trợ Twilio cho luồng quên mật khẩu, nhưng local hiện chưa có cấu hình.

Biến backend:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM=SO_TWILIO_CO_SMS
```

Lưu ý với Twilio trial:

- chỉ gửi tới số người nhận đã xác minh;
- số Twilio phải hỗ trợ SMS quốc tế;
- bật Geo Permissions cho Việt Nam;
- trial có giới hạn số tin/ngày và thêm nội dung trial vào SMS;
- không phù hợp để giảng viên nhập số điện thoại bất kỳ.

Vì vậy lựa chọn khuyến nghị:

```text
Đăng ký: email OTP
Quên mật khẩu: email OTP
SMS: không demo
```

Tài liệu tham khảo: [Twilio trial SMS restrictions](https://help.twilio.com/hc/en-us/articles/360036052753-Twilio-Free-Trial-Limitations).

## 6. Các thiếu sót OTP nên sửa nếu website mở công khai

Những mục này không bắt buộc cho buổi bảo vệ, nhưng nên xử lý nếu để website public lâu dài.

### P1-1. Rate limit hiện chỉ nằm trong RAM

File:

```text
backend/src/middlewares/rateLimit.js
```

Hiện tại dùng `Map`. Trên Vercel:

- mỗi Function instance có Map riêng;
- cold start làm mất dữ liệu limit;
- nhiều instance không chia sẻ giới hạn;
- không đủ chống spam OTP thật.

Hướng xử lý:

- dùng Upstash Redis/Vercel KV hoặc collection MongoDB làm shared rate-limit store;
- giới hạn theo cả IP và target đã hash;
- gợi ý: 1 lần/60 giây/target, 5 lần/15 phút/IP, giới hạn ngày theo target;
- không lưu email/số điện thoại rõ trong key rate limit nếu không cần.

### P1-2. Frontend luôn hiện lựa chọn SMS

File:

```text
frontend/src/pages/ForgotPassword.jsx
```

Hiện tại SMS vẫn xuất hiện ngay cả khi Twilio chưa cấu hình. User chọn SMS trên production sẽ nhận lỗi 503.

Có hai cách:

1. đơn giản cho đồ án: bỏ lựa chọn SMS và chỉ giữ email;
2. đúng kiến trúc: thêm endpoint `GET /api/auth/config` trả về kênh OTP nào đang bật, sau đó frontend chỉ hiện kênh khả dụng.

File dự kiến phải sửa nếu làm cách 2:

- `backend/src/services/otpDeliveryService.js`
- `backend/src/controllers/authController.js`
- `backend/src/routes/authRoutes.js`
- `frontend/src/api/authApi.js`
- `frontend/src/pages/ForgotPassword.jsx`

### P1-3. Chưa có nút gửi lại OTP và countdown rõ ràng

File:

- `frontend/src/pages/Register.jsx`
- `frontend/src/pages/ForgotPassword.jsx`

Hiện user phải quay lại form để gửi lại. Nên thêm:

- countdown 60 giây;
- nút **Gửi lại mã**;
- khóa nút trong thời gian chờ;
- hiển thị thời gian còn hiệu lực;
- backend vẫn phải tự kiểm tra cooldown, không chỉ tin frontend.

### P1-4. Chưa test provider thật trong automated test

Test hiện tại xác minh logic OTP bằng `debugOtp`, chưa gọi SMTP/Twilio thật.

Nên bổ sung unit test mock cho:

- `transporter.sendMail()` thành công/thất bại;
- Twilio trả HTTP 201 và HTTP lỗi;
- production thiếu provider trả 503;
- provider timeout;
- response production không chứa `debugOtp`.

Không gọi Brevo/Twilio thật trong CI.

### P1-5. Chưa có timeout/retry rõ cho provider

`otpDeliveryService.js` chưa cấu hình timeout riêng cho SMTP và `fetch()` Twilio. Trên serverless, provider treo có thể giữ Function quá lâu.

Nên thêm:

- connection timeout;
- socket timeout;
- AbortController cho Twilio fetch;
- log request ID, channel và lỗi đã che dữ liệu nhạy cảm;
- chỉ retry lỗi mạng tạm thời, không retry lỗi xác thực credentials.

## 7. Upload ảnh còn thiếu gì

### Trạng thái

Backend local có thể ghi file vào `uploads`, nhưng Vercel filesystem không phải nơi lưu ảnh bền vững. Frontend đã có nhánh upload trực tiếp lên Cloudinary khi đủ hai biến:

```env
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Nếu để trống, trang quản trị chỉ nhận URL HTTPS; đây là hành vi an toàn cho demo.

### Nếu cần demo upload từ máy

1. tạo Cloudinary account;
2. tạo unsigned upload preset;
3. giới hạn preset vào một folder riêng;
4. giới hạn định dạng JPG, PNG, WEBP, GIF;
5. giới hạn kích thước file;
6. điền hai biến trên Netlify;
7. redeploy frontend;
8. test ảnh vẫn tồn tại sau khi redeploy Vercel/Netlify.

Rủi ro:

- unsigned preset nằm trong frontend và có thể bị lạm dụng;
- với production thật nên dùng signed upload từ backend;
- không dùng `backend/uploads` trên Vercel.

File liên quan:

- `frontend/src/api/uploadApi.js`
- `frontend/src/components/admin/AdminImageUpload.jsx`
- `backend/src/services/uploadService.js` chỉ phù hợp local/Docker hoặc host có persistent disk.

## 8. Thanh toán còn thiếu gì

### COD

COD luôn bật và đủ dùng cho đồ án. Đây là phương thức nên demo.

### Chuyển khoản ngân hàng

Chỉ hiện khi điền đủ trên Vercel:

```env
BANK_NAME=
BANK_BIN=
BANK_ACCOUNT_NUMBER=
BANK_ACCOUNT_NAME=
```

Đây mới là hiển thị thông tin chuyển khoản, chưa có webhook tự động xác nhận tiền.

### MoMo

Chỉ hiện khi điền:

```env
MOMO_PHONE=
MOMO_ACCOUNT_NAME=
```

Đây mới là hiển thị thông tin MoMo, chưa tích hợp MoMo Payment API/webhook.

### VNPay Sandbox

Chỉ bật nếu có:

```env
VNPAY_TMN_CODE=TMN_CODE_SANDBOX
VNPAY_HASH_SECRET=HASH_SECRET_SANDBOX
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://TEN-BACKEND.vercel.app/api/payments/vnpay/return
VNPAY_VERSION=2.1.0
```

IPN URL cần khai báo với VNPay Sandbox:

```text
https://TEN-BACKEND.vercel.app/api/payments/vnpay/ipn
```

Nếu không có merchant key, để trống. `/api/payments/config` sẽ báo VNPay disabled và frontend tự ẩn.

Không dùng VNPay production hoặc tiền thật cho đồ án.

## 9. SEO, Swagger và tài liệu còn thiếu

### P1-6. SEO đang có nguy cơ trỏ localhost

File:

- `frontend/scripts/generate-site-metadata.mjs`
- `frontend/vite.config.js`
- `frontend/public/robots.txt`
- `frontend/public/sitemap.xml`

Không cần sửa code nếu Netlify đã có:

```env
VITE_SITE_URL=https://TEN-SITE.netlify.app
```

Sau build kiểm tra:

```text
https://TEN-SITE.netlify.app/robots.txt
https://TEN-SITE.netlify.app/sitemap.xml
```

Không được còn `localhost:5173`.

### P1-7. Swagger còn URL Render mẫu

File cần sửa:

```text
backend/src/config/swagger.js
```

Hiện `servers` có localhost và URL Render mẫu. Nên dùng `env.apiPublicUrl`:

```js
const env = require('./env');

servers: [
  { url: `${env.apiPublicUrl.replace(/\/+$/, '')}/api`, description: 'Current environment' },
]
```

Vercel phải có:

```env
API_PUBLIC_URL=https://TEN-BACKEND.vercel.app
```

### P1-8. Tài liệu đang mâu thuẫn Render và Vercel

Các file cũ vẫn ghi Render:

- `deployment.md`
- `PROJECT_COMPLETE.md`
- `QUICK_REFERENCE.md`
- `COMPLETION_SUMMARY.md`
- `docs/report/software-engineering-report.md`
- `docs/diagrams/system-architecture.md`

Trong khi runbook mới chọn Vercel:

- `docs/deployment/2026-07-29-vercel-netlify-class-project-runbook.md`

Nên chọn một kiến trúc chính và cập nhật tất cả tài liệu. Với quyết định hiện tại, dùng Netlify + Vercel + Atlas.

Runbook ngày 29/07 còn ghi Vercel nhận trực tiếp `backend/server.js`; phần này cần cập nhật sau khi tạo `backend/api/index.js` và `backend/vercel.json`.

### P1-9. Chưa pin cùng một Node version

Hiện tại:

- Docker dùng Node 24;
- runbook Netlify dùng Node 24;
- GitHub Actions dùng Node 22;
- `package.json` chưa có `engines`.

Nên chọn một version chung. Nếu chọn Node 24:

```json
"engines": {
  "node": "24.x"
}
```

Thêm vào cả:

- `backend/package.json`
- `frontend/package.json`

Sau đó đổi `.github/workflows/ci.yml` sang Node 24 và chạy lại CI.

## 10. Cấu hình Netlify chi tiết

### Cách dùng UI hiện tại

```text
Repository: TrungNguyen410/TechPhone-Store
Production branch: main
Base directory: frontend
Build command: npm run build
Publish directory: dist
```

Environment:

```env
NODE_VERSION=24
VITE_USE_MOCK=false
VITE_API_URL=https://TEN-BACKEND.vercel.app/api
VITE_SITE_URL=https://TEN-SITE.netlify.app
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_GA_MEASUREMENT_ID=
```

Ba biến cuối tùy chọn.

Kiểm tra sau deploy:

- refresh `/products`, `/cart`, `/admin` không 404;
- request API không gọi localhost;
- canonical URL không phải localhost;
- sitemap dùng Netlify domain.

Tài liệu tham khảo: [Netlify monorepo configuration](https://docs.netlify.com/build/configure-builds/monorepos/).

## 11. Cấu hình Vercel chi tiết

```text
Repository: TrungNguyen410/TechPhone-Store
Production branch: main
Root directory: backend
Framework preset: Other
```

Biến bắt buộc:

```env
NODE_ENV=production
MONGO_URI=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://TEN-SITE.netlify.app
PUBLIC_SITE_URL=https://TEN-SITE.netlify.app
API_PUBLIC_URL=https://TEN-BACKEND.vercel.app
```

OTP email:

```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=TechPhone <EMAIL_DA_XAC_MINH>
```

Tùy chọn:

- Twilio;
- bank/MoMo;
- VNPay Sandbox.

Không cần đặt `PORT` trên Vercel.

Sau deploy lần đầu:

1. lấy production URL;
2. cập nhật `API_PUBLIC_URL`;
3. nếu dùng VNPay, cập nhật `VNPAY_RETURN_URL`;
4. redeploy;
5. kiểm tra runtime logs.

## 12. Seed dữ liệu demo an toàn

Seed sẽ xóa dữ liệu cũ trong database được chọn. Chỉ chạy với database đồ án.

```powershell
cd "D:\TechPhone Store\backend"
$env:MONGO_URI="MONGODB_ATLAS_URI"
$env:SEED_DEMO_PASSWORD="MAT_KHAU_DEMO_IT_NHAT_12_KY_TU"
npm run seed
Remove-Item Env:MONGO_URI
Remove-Item Env:SEED_DEMO_PASSWORD
```

Sau seed:

- kiểm tra collections trên Atlas;
- đăng nhập admin/customer bằng mật khẩu vừa đặt;
- không ghi mật khẩu demo vào tài liệu public;
- không seed lại sau khi đã có dữ liệu cần giữ.

## 13. Checklist xác minh sau deploy

### Backend

- [ ] `/api/health` trả 200.
- [ ] `/api/products` có dữ liệu.
- [ ] `/api/docs` mở được.
- [ ] Swagger gọi đúng Vercel URL.
- [ ] `/api/payments/config` chỉ bật provider đã cấu hình.
- [ ] Vercel logs không có Mongo timeout/authentication error.
- [ ] Function không mở quá nhiều Mongo connection.

### Frontend

- [ ] Trang chủ tải sản phẩm từ Vercel.
- [ ] Console không có CORS error.
- [ ] Network không gọi localhost.
- [ ] Refresh route con không 404.
- [ ] `robots.txt` và `sitemap.xml` dùng Netlify URL.
- [ ] Admin đăng nhập được.
- [ ] Customer đăng nhập được.

### OTP

- [ ] Production không trả `debugOtp`.
- [ ] Email OTP đến Inbox/Spam.
- [ ] OTP sai bị từ chối.
- [ ] OTP hết hạn bị từ chối.
- [ ] OTP dùng lại bị từ chối.
- [ ] Đăng ký thành công tạo user đã xác minh email.
- [ ] Quên mật khẩu hoạt động.
- [ ] SMS được ẩn nếu Twilio chưa cấu hình.

### Checkout

- [ ] Tạo đơn COD được.
- [ ] Tồn kho giảm đúng.
- [ ] Hủy đơn khôi phục tồn kho.
- [ ] Admin cập nhật trạng thái đơn được.
- [ ] Tra cứu đơn hoạt động.
- [ ] VNPay chỉ xuất hiện nếu Sandbox đã cấu hình.

### Upload

- [ ] Nếu không có Cloudinary: giao diện nhận URL HTTPS.
- [ ] Nếu có Cloudinary: upload xong ảnh vẫn tồn tại sau redeploy.
- [ ] Không dùng URL `/uploads/...` của Vercel làm ảnh bền vững.

## 14. Thứ tự thực hiện đề xuất

```text
1. Tạo backend/api/index.js
2. Tạo backend/vercel.json
3. Thêm app.set('trust proxy', 1)
4. Sửa Swagger production URL
5. Pin Node version và đồng bộ CI
6. Chạy backend test + frontend lint/test/build
7. Commit tài liệu deploy đang untracked
8. Chuyển PR #3 khỏi draft và merge main
9. Tạo Atlas Free/M0
10. Seed dữ liệu demo
11. Tạo Netlify site để lấy frontend URL
12. Tạo JWT secrets
13. Tạo Brevo sender + SMTP key
14. Deploy backend Vercel với env production
15. Cập nhật API_PUBLIC_URL và redeploy Vercel
16. Điền VITE_API_URL + VITE_SITE_URL trên Netlify
17. Redeploy Netlify
18. Test CORS, đăng nhập, COD và admin
19. Test email OTP đăng ký + quên mật khẩu
20. Chỉ sau đó mới cân nhắc Cloudinary hoặc VNPay Sandbox
```

## 15. Mức triển khai khuyến nghị cho buổi bảo vệ

Nên bật:

- Netlify frontend;
- Vercel backend;
- Atlas Free/M0;
- tài khoản seed;
- COD;
- email OTP bằng Brevo nếu đã test trước;
- upload bằng URL HTTPS.

Không cần bật:

- SMS OTP Twilio;
- VNPay production;
- MoMo API thật;
- persistent file upload trên Vercel;
- domain trả phí;
- Google Analytics.

Kịch bản dự phòng nếu Brevo lỗi sát giờ:

1. dùng tài khoản seed để đăng nhập;
2. không demo đăng ký/quên mật khẩu;
3. trình bày code OTP và test tự động;
4. chuẩn bị ảnh/video email OTP đã chạy thành công trước đó.

## 16. Danh sách file cần xử lý

### Bắt buộc trước Vercel

- [ ] Tạo `backend/api/index.js`.
- [ ] Tạo `backend/vercel.json`.
- [ ] Sửa `backend/src/app.js` để bật trust proxy.
- [ ] Sửa `backend/src/config/swagger.js` để dùng `API_PUBLIC_URL`.
- [ ] Kiểm tra `backend/.env.example` phản ánh đủ biến production.

### Khuyến nghị

- [ ] Sửa `backend/package.json` để pin Node.
- [ ] Sửa `frontend/package.json` để pin Node.
- [ ] Sửa `.github/workflows/ci.yml` để cùng Node version.
- [ ] Sửa `backend/src/middlewares/rateLimit.js` thành shared rate limit nếu để public lâu dài.
- [ ] Sửa `frontend/src/pages/ForgotPassword.jsx` để ẩn SMS khi chưa cấu hình.
- [ ] Thêm resend countdown trong `frontend/src/pages/Register.jsx` và `ForgotPassword.jsx`.
- [ ] Thêm provider tests cho `backend/src/services/otpDeliveryService.js`.

### Tài liệu

- [ ] Commit `docs/deployment/2026-07-29-vercel-netlify-class-project-runbook.md`.
- [ ] Commit file audit này.
- [ ] Cập nhật `deployment.md` từ Render sang Vercel.
- [ ] Cập nhật `PROJECT_COMPLETE.md`.
- [ ] Cập nhật `QUICK_REFERENCE.md`.
- [ ] Cập nhật `COMPLETION_SUMMARY.md`.
- [ ] Cập nhật `docs/report/software-engineering-report.md`.
- [ ] Cập nhật `docs/diagrams/system-architecture.md`.

Khi tất cả mục P0 hoàn thành, dự án mới ở trạng thái sẵn sàng deploy theo kiến trúc Netlify + Vercel + Atlas.
