# Catalog sản phẩm thật + bộ ảnh (2026-08-21)

## Dữ liệu

`backend/src/seed/catalogData.js` giữ 25 điện thoại + 10 phụ kiện (thay hoàn toàn 12 sản phẩm demo cũ).
`backend/src/seed/seed.js` map dữ liệu này sang schema `Product` / `Accessory`, cộng thêm 3 fixture cho test:
`phone-lowstock` (kiểm tra cảnh báo tồn kho thấp), `phone-inactive`, `accessory-inactive`.

Sau khi seed: **27 products, 11 accessories**.

## Ảnh

Ảnh nằm ở `backend/uploads/catalog/<imageSlug>-<n>.<ext>` (n bắt đầu từ 1).
`seed.js` tự quét thư mục này; sản phẩm nào không có file sẽ rơi về ảnh placeholder `placehold.co`.

Nguồn: gallery sản phẩm của CellphoneS (`cdn2.cellphones.com.vn/insecure/rs:fit:900:900/...`),
riêng OPPO A5 Pro lấy từ FPT Shop. Script lọc theo tỉ lệ khung hình (0.82–1.22) để loại
banner quảng cáo và infographic dài, chỉ giữ ảnh render sản phẩm nền trắng.

**Hiện có ảnh thật: 26/35 sản phẩm, 97 file (~19 MB), phần lớn 4 góc chụp.**

### 9 sản phẩm còn dùng placeholder

Các SKU này đã ngừng phân phối tại VN (tháng 8/2026) — không còn trang sản phẩm trên
CellphoneS, Thế Giới Di Động, FPT Shop hay Hoàng Hà Mobile, nên không lấy được ảnh thật:

| Sản phẩm | Ghi chú |
|---|---|
| vivo X200 Pro | chỉ còn bài viết sforum, không còn trang bán |
| vivo V50 | trang vivo.com render bằng JS, không scrape được |
| realme GT 7 Pro | CellphoneS chỉ còn realme GT 7 |
| realme 14 Pro+ | đã gỡ khỏi mọi retailer kiểm tra |
| Củ sạc Anker GaNPrime 67W A2668 | chỉ còn bản 70W A121C (mã khác) |
| Củ sạc Samsung 45W Type-C | chỉ còn bản 25W |
| Pin dự phòng Anker MagGo 10.000mAh Qi2 A1654 | chỉ còn bản 5.000mAh A1665 |
| Pin dự phòng Baseus Blade HD 100W 20.000mAh | chỉ còn dòng Enerfill |
| Vòng đeo tay Xiaomi Smart Band 9 | đã ngừng bán |

Cố tình **không** thay bằng ảnh của SKU khác — ảnh sai model gây hiểu nhầm cho người mua.
Khi cần, chỉ việc thả file `<imageSlug>-1.jpg`… vào `backend/uploads/catalog/`,
điền `imageSlug` trong `catalogData.js` rồi seed lại.

## Deploy: hai điểm phải nhớ

1. **`API_PUBLIC_URL`** — `seed.js` nhúng host này vào từng URL ảnh khi ghi DB.
   Mặc định là `http://localhost:5000`. Nếu seed production mà quên set biến này,
   toàn bộ ảnh sản phẩm sẽ trỏ về localhost và không hiện. Set trước khi chạy seed,
   không phải sau.

2. **`/uploads` không được phục vụ trên serverless** — `src/config/env.js` đặt
   `localUploadsEnabled = false` khi `DEPLOYMENT_TARGET` là `vercel`, `netlify`,
   `serverless` hay `aws-lambda`, nên `app.js` bỏ qua middleware `express.static('/uploads')`.
   Trên các target đó, ảnh catalog sẽ 404 dù DB có URL đúng.
   Cách xử lý: deploy backend lên target có filesystem (Render/Railway/VPS),
   hoặc đẩy `uploads/catalog/` lên CDN/object storage rồi trỏ `API_PUBLIC_URL` vào đó.

## Chạy seed

`npm run seed` **xoá sạch mọi collection** (`deleteMany({})`) trước khi ghi.
`backend/.env` hiện trỏ tới một MongoDB Atlas thật — chạy seed với file env đó
sẽ xoá dữ liệu thật. Kiểm chứng thay đổi seed bằng `mongodb-memory-server` trước.
