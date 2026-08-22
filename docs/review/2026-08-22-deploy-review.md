# Review bản deploy — 2026-08-22

- Frontend: https://techphone-store-web.netlify.app (Netlify)
- Backend: https://techphone-store-api.vercel.app/api (Vercel)
- Commit đang chạy: `5b73682` (`origin/devnguyen` = `origin/deploy-netlify-vercel`)
- Commit ở local chưa push: `4541662`, `bc1058d`

> **Cập nhật 2026-08-22, sau khi chốt plan:** B1, B2, B3, B5, B6, B9, B10 đã sửa
> ở commit `content-seed`. B4 và B7 giữ nguyên theo quyết định của chủ dự án
> (giữ iPhone 15 và 9 SKU ngừng bán), riêng mô tả tiếng Anh của iPhone 15 vẫn
> được viết lại sang tiếng Việt vì để nguyên thì vô nghĩa với khách. B8 chưa làm.
> Thông tin liên hệ đã đổi sang số thật: hotline `0918550811`,
> email `trungnguyen550811@gmail.com`, địa chỉ `Đường Trần Văn Giàu, Hòa Thuận, Vĩnh Long`.

Kết luận ngắn: **site đã deploy thành công và chạy được**. Không có lỗi 5xx, không
có lỗi phân quyền, không có lỗi CORS. Vấn đề còn lại nằm ở **chất lượng nội dung
dữ liệu seed** — nhiều chữ hiển thị cho khách vẫn là tiếng Việt không dấu hoặc
tiếng Anh, và một sản phẩm dùng để test lọt ra ngoài storefront.

---

## A. Đã sửa ở local nhưng site chưa có (chỉ cần push)

Những cái này không cần xác minh lại, chúng là công việc của phiên trước chưa đẩy lên.

| # | Trên site đang chạy | Đã sửa ở commit |
|---|---|---|
| A1 | Banner trang chủ vẫn là ảnh `placehold.co` | `bc1058d` |
| A2 | Không có logo, không có favicon | `bc1058d` |
| A3 | Danh mục nổi bật vẫn dùng icon vẽ | `bc1058d` |
| A4 | Icon TikTok là nốt nhạc; link social là địa chỉ giả | `bc1058d` |
| A5 | Admin vẫn `0900000000` / `123456` | `bc1058d` |
| A6 | Vẫn còn dòng "Dùng thử: TP260601 · 0911111111" | `bc1058d` |
| A7 | Chữ đè nhau trong "Đơn hàng của tôi" | `bc1058d` |
| A8 | Seed từ Docker/Render mất sạch ảnh catalog | `4541662` |

---

## B. Lỗi thật còn tồn tại — cần xác nhận trước khi sửa

Mỗi mục có cách tự kiểm chứng.

### B1. Mô tả sản phẩm mất dấu tiếng Việt — ẢNH HƯỞNG LỚN

Mọi sản phẩm và phụ kiện đều có mô tả dạng:

> iPhone 16 Pro Max **chinh hang, bao hanh 12 thang** tai TechPhone Store.

Hiện ở trang chi tiết của cả 36 sản phẩm.

Kiểm chứng: `curl -s https://techphone-store-api.vercel.app/api/products/phone-1`
rồi xem trường `description`.

Nguồn: `backend/src/seed/seed.js` — template mô tả dùng chuỗi không dấu.

Cách sửa: đổi template thành `"... chính hãng, bảo hành 12 tháng tại TechPhone Store."`

### B2. Khóa thông số kỹ thuật mất dấu — ẢNH HƯỞNG LỚN

Bảng thông số ở trang chi tiết hiện các nhãn: `Man hinh`, `Chip xu ly`,
`Bo nho trong`, `Camera sau`, `Camera truoc`, `Thiet ke`, `He dieu hanh`.
Phần **giá trị** thì đúng dấu ("6.9 inch, Super Retina XDR OLED..."), chỉ có
**nhãn** là sai — nhìn rất lệch.

Kiểm chứng: cùng lệnh trên, xem trường `specifications`.

Nguồn: `backend/src/seed/seed.js`, object `specifications` trong `products.map`.

Cách sửa: đổi key thành `Màn hình`, `Chip xử lý`, `Bộ nhớ trong`, `Camera sau`,
`Camera trước`, `Thiết kế`, `Hệ điều hành`.

### B3. Tên danh mục mất dấu — ẢNH HƯỞNG TRUNG BÌNH

Dropdown "Loại phụ kiện" ở trang Phụ kiện hiện: `Dong ho`, `Phu kien`,
`Pin du phong`, `Sac`, `Tai nghe`.

Kiểm chứng: mở https://techphone-store-web.netlify.app/accessories rồi mở dropdown,
hoặc `curl -s .../api/categories`.

Nguồn: `backend/src/seed/seed.js` — `Category.insertMany` và `categoryIdByName`.

Lưu ý khi sửa: tên danh mục vừa là chữ hiển thị vừa là **giá trị lọc trên URL**.
Đổi tên thì phải đổi đồng bộ:

- `categoryIdByName` trong `seed.js`
- trường `category` trong `catalogData.js` (10 phụ kiện)
- link thẻ danh mục trong `Home.jsx` (`?category=Sac`, `?category=Phu%20kien`)

### B4. Sản phẩm dùng để test lọt ra storefront — ẢNH HƯỞNG LỚN

Sản phẩm `phone-lowstock` tên **"iPhone 15"**:

- `status: 'active'` nên khách nhìn thấy và mua được
- ảnh là `placehold.co`
- mô tả bằng tiếng Anh: *"A compact iPhone option for catalog filtering and low-stock checks."*
- `stock: 2` — nó tồn tại chỉ để test cảnh báo sắp hết hàng

Kiểm chứng: tìm "iPhone 15" trên site, hoặc `curl -s .../api/products | grep -i "low-stock"`.

Cách sửa, chọn một trong hai:

1. Đổi thành SKU thật — iPhone 15 là máy còn bán, tải ảnh thật và viết mô tả
   tiếng Việt, giữ `stock: 2` để vẫn test được luồng sắp hết hàng. **Đề xuất cái này.**
2. Đổi `status` thành `inactive` — mất luôn khả năng test cảnh báo tồn kho ở admin.

### B5. Đánh giá sản phẩm bằng tiếng Anh — ẢNH HƯỞNG TRUNG BÌNH

3 đánh giá hiện trên trang sản phẩm đều tiếng Anh:

- "Great product quality and fast delivery."
- "Helpful staff and transparent warranty policy."
- "Noise cancellation works very well."

Kiểm chứng: `curl -s .../api/reviews`

Cách sửa: viết lại bằng tiếng Việt, và thêm vài đánh giá nữa cho các sản phẩm
khác — hiện chỉ có 3 đánh giá cho toàn bộ catalog nên hầu hết trang sản phẩm trống.

### B6. Địa chỉ cửa hàng mất dấu — ẢNH HƯỞNG TRUNG BÌNH

Footer, trang Liên hệ và link Google Maps đều hiện
`123 Nguyen Hue, District 1, Ho Chi Minh City`.

Đáng chú ý: giá trị mặc định trong `frontend/src/utils/storeSettings.js` đã đúng dấu
(`123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh`), nhưng giá trị trong DB đè lên nó.

Kiểm chứng: `curl -s .../api/settings | grep address`

Cách sửa: sửa `setting-4` trong seed cho khớp với default của frontend.

### B7. 10 sản phẩm vẫn là ảnh placeholder — ĐÃ BIẾT, CẦN QUYẾT ĐỊNH

Điện thoại: realme 14 Pro+, realme GT 7 Pro, vivo V50, vivo X200 Pro, iPhone 15 (mục B4).
Phụ kiện: Anker GaNPrime 67W A2668, Baseus Blade HD 100W, Samsung 45W,
Anker MagGo A1654, Xiaomi Smart Band 9.

9 cái (trừ iPhone 15) đã ngừng bán trên CellphoneS / TGDĐ / FPT Shop / Hoàng Hà
tính đến 8/2026 nên không lấy được ảnh thật. Để placeholder là cố ý, không mượn
ảnh của SKU khác vì như vậy là lừa người mua.

Cần quyết: **gỡ hẳn 9 SKU này khỏi catalog**, hay **thay bằng 9 SKU đang bán**
(tìm ảnh thật), hay **giữ nguyên placeholder**?

### B8. OPPO A5 Pro chỉ có 1 ảnh — ẢNH HƯỞNG NHỎ

Các sản phẩm khác có 4 ảnh, riêng OPPO A5 Pro có 1 nên gallery trông trống.

Cách sửa: tải thêm 3 ảnh cho SKU này.

### B9. Tên thương hiệu viết hoa sai — ẢNH HƯỞNG NHỎ

Hiện `Vivo`, `Realme`. Hai hãng này viết thường theo nhận diện chính thức:
`vivo`, `realme`.

### B10. Danh mục "Phu kien" đang bị tắt nhưng sản phẩm vẫn bán — ẢNH HƯỞNG NHỎ

`category-5` có `active: false`, nhưng Ốp lưng UAG thuộc danh mục đó vẫn
`status: active` và vẫn hiện ngoài storefront. Dữ liệu mâu thuẫn: admin thấy
danh mục tắt, khách vẫn mua được hàng trong đó.

Cách sửa: bật `active: true` cho `category-5`.

---

## C. Đã kiểm tra và KHÔNG có vấn đề

Ghi lại để khỏi phải kiểm tra lại.

- **Phân quyền**: ma trận anon / customer / admin đúng hoàn toàn. Khách vãng lai
  bị 401 ở `/contacts`, `/vouchers`, `/orders/my-orders`, `/auth/me`, `/admin/*`.
  Customer bị 403 ở `/contacts`, `/vouchers`, `/admin/*`. Admin 200 hết.
- **CORS**: chỉ chấp nhận origin `https://techphone-store-web.netlify.app`.
  Origin lạ không được cấp `Access-Control-Allow-Origin`.
- **Security headers**: có đủ CSP, HSTS `max-age=31536000; includeSubDomains`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`.
- **Rate limit tra cứu đơn**: hoạt động đúng, 429 sau 10 lần / 15 phút. Bộ đếm
  lưu trong MongoDB chứ không phải bộ nhớ tiến trình, nên serverless nhiều
  instance vẫn chặn đúng.
- **Toàn bộ endpoint admin** (dashboard, customers, products, accessories,
  categories, brands, orders, reviews, vouchers, banners, settings): 200.
- **Ghi dữ liệu ở admin** (tạo / sửa / xóa sản phẩm, đổi trạng thái đơn): 200,
  test trên bản Docker local.
- **Ảnh catalog trên deploy**: 99 URL Cloudinary ở sản phẩm, 24 ở phụ kiện,
  **0 URL localhost**. Bản deploy không dính lỗi `path.join` (`4541662`) vì lần
  seed đó chạy từ máy local với `UPLOAD_DIR` tương đối.
- **Tra cứu đơn hàng**: `TP260601` + `0911111111` trả về đúng đơn; sai số điện
  thoại trả 404.
- **Kiểm tra voucher**: `TECH10` hợp lệ với đơn 30 triệu.
- **Cloudinary trên Netlify**: `dxozklkr` có trong bundle nên upload ảnh ở admin chạy được.
- **Mục yêu thích**: `Favorites.jsx` đã lọc theo ID còn tồn tại, lỗi "chọn 1 hiện 2" đã hết.
- **Phân trang**: `/products` và `/accessories` trả về đủ toàn bộ, không bị cắt mặc định.
- **Thời gian phản hồi API**: 0.4s–1.4s; lần gọi đầu 5.7s do cold start Vercel.

---

## D. Câu hỏi cần trả lời

1. **Hotline `1900 6868` và email `support@techphone.vn` là giả.** Đổi sang số
   và email thật không? (Số admin đã cho là `0918550811` — dùng luôn làm hotline?)
2. **9 SKU ngừng bán ở mục B7** — gỡ, thay SKU khác, hay giữ nguyên?
3. **iPhone 15 ở mục B4** — biến thành SKU thật (đề xuất) hay ẩn đi?
4. Địa chỉ `123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh` là địa chỉ giả — có địa chỉ
   thật muốn dùng không?

---

## E. Thứ tự thực hiện đề xuất

**Bước 1 — push cái đã có** (`4541662`, `bc1058d`). CI tự đẩy sang
`deploy-netlify-vercel`, Netlify và Vercel build lại. Xong mục A1–A8.

**Bước 2 — sửa nội dung seed**, một commit gồm B1, B2, B5, B6, B9, B10.
Toàn bộ là sửa chuỗi trong `seed.js`, rủi ro thấp.

**Bước 3 — đổi tên danh mục có dấu** (B3), commit riêng vì phải sửa đồng bộ 3 file
và dễ làm hỏng link lọc.

**Bước 4 — xử lý B4, B7, B8** sau khi có câu trả lời mục D. Cần tải ảnh thật nên lâu nhất.

**Bước 5 — seed lại Atlas.** Lưu ý: `npm run seed` xóa sạch mọi collection, kể cả
6 đơn hàng demo đang có. Nếu muốn giữ đơn hàng thì viết script chỉ cập nhật
sản phẩm / danh mục / đánh giá / cài đặt thay vì seed lại toàn bộ.
