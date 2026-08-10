# Thiết kế hoàn thiện deploy TechPhone Store trong hai ngày với chi phí 0 đồng

**Ngày duyệt thiết kế:** 10/08/2026  
**Thời hạn hoàn thành:** hết ngày 11/08/2026  
**Trạng thái:** Đã được chủ dự án chấp thuận  

## 1. Mục tiêu

Đưa TechPhone Store lên môi trường có thể trình diễn và chụp bằng chứng báo cáo bằng kiến trúc:

```text
Netlify (React/Vite) -> Vercel (Express API) -> MongoDB Atlas
                                  |
                                  +-> Cloudinary cho ảnh sản phẩm
```

Kết quả ưu tiên là quản trị viên đăng nhập được, thêm sản phẩm có ảnh công khai được, khách xem được sản phẩm, đặt đơn COD được và quản trị viên xử lý được đơn. OTP được thử bằng Twilio Trial trong một khoảng thời gian cố định; nếu điều kiện nhà mạng Việt Nam không cho phép gửi thật thì báo cáo sử dụng bằng chứng local/test và tài khoản seed, không giả lập SMS thật trên production.

## 2. Ràng buộc toàn dự án

- Tổng thời gian còn lại là hai ngày: 10/08/2026 và 11/08/2026.
- Chi phí bắt buộc là 0 đồng; không nhập thẻ và không nâng cấp gói trả phí.
- Không bổ sung nghiệp vụ mới ngoài deploy, thêm sản phẩm, ảnh sản phẩm, OTP và kiểm tra các phương thức thanh toán đã có.
- Không dùng VNPay production và không thực hiện giao dịch tiền thật.
- Không bật `NODE_ENV=development` trên Vercel production.
- Không đưa OTP, JWT secret, MongoDB URI, Cloudinary secret hoặc Twilio Auth Token vào Git hay ảnh báo cáo.
- Mỗi giai đoạn chỉ được chuyển tiếp khi tiêu chí đạt của giai đoạn trước đã được xác minh.
- Khi một tích hợp tùy chọn vượt quá timebox, phải dùng fallback đã định nghĩa thay vì mở rộng phạm vi.

## 3. Phương án được chọn

### 3.1 Hạ tầng miễn phí

- Frontend: Netlify Free, triển khai thư mục `frontend`.
- Backend: Vercel Hobby, triển khai thư mục `backend`.
- Database: MongoDB Atlas Free; cluster phải hỗ trợ replica set vì nghiệp vụ đặt hàng dùng transaction.
- Ảnh: Cloudinary Free với unsigned upload preset chỉ dành cho demo.
- SMS: Twilio Trial, không cần thẻ, chỉ dùng cho số điện thoại đã xác minh và chỉ thử trong tối đa 90 phút.

### 3.2 Luồng triển khai

1. Xác minh source, test, lint và build ở local.
2. Tạo Atlas, database user và network access.
3. Deploy backend lên Vercel với biến môi trường production.
4. Seed dữ liệu demo vào Atlas và xác minh API công khai.
5. Deploy frontend lên Netlify với `VITE_USE_MOCK=false`.
6. Cấu hình Cloudinary và xác minh admin thêm sản phẩm từ trình duyệt production.
7. Timebox tích hợp/thử Twilio OTP trong 90 phút.
8. Xác minh COD; chỉ bật chuyển khoản, MoMo hoặc VNPay Sandbox khi cấu hình đã có và hoạt động.
9. Chạy smoke test production, chụp bằng chứng và hoàn thiện nội dung báo cáo.

## 4. Thiết kế OTP không tốn chi phí

### Nhánh A: Twilio Trial hoạt động

- Chỉ gửi tới số điện thoại của người trình bày đã được xác minh trong Twilio.
- Dùng Twilio Verify Trial thay vì tự gửi nội dung SMS tùy ý.
- Chỉ coi nhánh này đạt khi điện thoại thật nhận mã và đăng ký hoặc đặt lại mật khẩu hoàn thành trên deployment production.
- Trong báo cáo phải ghi đây là môi trường trial giới hạn 30 ngày và không đại diện cho hệ thống SMS thương mại.

### Nhánh B: Twilio Trial không hoạt động sau 90 phút

- Dừng xử lý Twilio, không đổi sang nhà cung cấp SMS trả phí khác.
- Production dùng tài khoản seed để đăng nhập và trình diễn các nghiệp vụ còn lại.
- Không hiển thị OTP trực tiếp trên giao diện production và không chạy Vercel bằng development mode.
- Chứng minh OTP bằng test tự động, log local không chứa secret và thao tác local với `debugOtp`.
- Báo cáo ghi rõ: logic tạo, hash, TTL, giới hạn lần nhập và dùng một lần đã hoàn thành; kênh SMS production chưa được thương mại hóa do ràng buộc chi phí/Sender ID.

## 5. Phạm vi thanh toán

- COD là luồng bắt buộc phải hoạt động từ đầu đến cuối.
- Chuyển khoản và MoMo chỉ là thông tin/QR cùng bước xác nhận thủ công; báo cáo không gọi đây là webhook tự động.
- VNPay chỉ được thử ở Sandbox nếu tài khoản và merchant key đã có sẵn trong thời gian còn lại.
- Thiếu VNPay key không được phép chặn hoàn thành deploy và báo cáo.

## 6. Kế hoạch thời gian

### Ngày 1 — 10/08/2026: deploy và thêm sản phẩm

- Buổi 1: kiểm tra Git, test local và tạo MongoDB Atlas.
- Buổi 2: deploy Vercel backend, cấu hình env và seed dữ liệu.
- Buổi 3: deploy Netlify frontend, nối API và sửa CORS nếu cần.
- Buổi 4: cấu hình Cloudinary, đăng nhập admin, thêm một sản phẩm demo và đặt một đơn COD.

Điều kiện kết thúc ngày 1: URL frontend và backend ổn định; dữ liệu tồn tại trong Atlas; sản phẩm thêm từ admin xuất hiện ở trang khách sau khi tải lại; đơn COD xuất hiện trong admin.

### Ngày 2 — 11/08/2026: OTP, ổn định và báo cáo

- 90 phút đầu: tạo Twilio Trial, xác minh số demo và thử Twilio Verify.
- Sau timebox: chốt nhánh OTP A hoặc B, không tiếp tục thử nhà cung cấp khác.
- Giữa ngày: kiểm tra đăng nhập, giỏ hàng, voucher, checkout, tra cứu/hủy đơn, admin và ảnh Cloudinary.
- Cuối ngày: chạy test/lint/build, chụp ảnh bằng chứng, ghi giới hạn và chuẩn bị kịch bản trình bày.

Điều kiện kết thúc ngày 2: toàn bộ checklist bắt buộc có bằng chứng PASS hoặc có fallback được ghi rõ; không còn mục chưa xác định và không còn secret trong tài liệu.

## 7. Tiêu chí hoàn thành

### Bắt buộc

- `GET /api/health` từ Vercel trả response thành công.
- Netlify gọi đúng Vercel API, không dùng mock và không gặp lỗi CORS.
- Admin production đăng nhập được bằng tài khoản seed có mật khẩu mạnh.
- Admin thêm được sản phẩm có URL ảnh Cloudinary và dữ liệu tồn tại sau redeploy.
- Khách xem sản phẩm, thêm giỏ hàng, đặt COD và tra cứu đơn được.
- Admin xem và cập nhật được trạng thái đơn.
- Frontend lint/test/build và backend test/coverage chạy thành công ở lần xác minh cuối.
- Báo cáo có ảnh kiến trúc deploy, trang chủ, thêm sản phẩm, checkout, quản lý đơn, Atlas, Cloudinary và kết quả test.

### Có điều kiện

- OTP SMS thật chỉ bắt buộc nếu Twilio Trial gửi được trong timebox 90 phút.
- VNPay chỉ bắt buộc nếu đã có Sandbox merchant key trước giai đoạn kiểm thử thanh toán.

## 8. Các nội dung bị loại khỏi phạm vi

- SMS production trả phí hoặc đăng ký Brandname thương mại.
- Firebase Phone Auth, SpeedSMS hoặc eSMS như phương án thay thế sau khi Twilio hết timebox.
- MoMo Payment API/webhook tự động.
- VNPay production.
- Redis/Upstash production nếu OTP chỉ được chứng minh ở chế độ trial/demo giới hạn.
- Tính năng khách hàng, quản trị, báo cáo hoặc giao diện mới.
- Tối ưu hiệu năng không liên quan trực tiếp đến deploy và buổi bảo vệ.

## 9. Cấu trúc runbook triển khai

Runbook tiếp theo phải chứa:

1. Bảng thông tin cần ghi lại nhưng không lưu secret.
2. Checklist chuẩn bị tài khoản miễn phí.
3. Lệnh PowerShell local và kết quả mong đợi.
4. Hướng dẫn Atlas từng màn hình.
5. Hướng dẫn Vercel từng màn hình và danh sách env.
6. Hướng dẫn seed/migration an toàn.
7. Hướng dẫn Netlify từng màn hình và danh sách env.
8. Hướng dẫn Cloudinary unsigned preset cho demo.
9. Kịch bản thêm sản phẩm và xác minh dữ liệu tồn tại.
10. Timebox Twilio Trial và điều kiện chuyển fallback.
11. Kiểm thử thanh toán theo đúng phạm vi.
12. Smoke-test production và bảng PASS/FAIL.
13. Danh sách ảnh chụp/bằng chứng cho báo cáo.
14. Quy trình xử lý lỗi và rollback không làm mất dữ liệu.

## 10. Nguồn nền tảng cần dùng trong runbook

- Twilio Trial: https://www.twilio.com/docs/usage/trials
- Twilio Verify: https://www.twilio.com/docs/verify/api/verification
- Quy định SMS Việt Nam: https://www.twilio.com/en-us/guidelines/vn/sms
- Vercel Express: https://vercel.com/docs/frameworks/backend/express
- Vercel monorepo: https://vercel.com/docs/monorepos
- Netlify Vite: https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/
- MongoDB Atlas với Vercel: https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/

