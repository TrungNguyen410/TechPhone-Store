# Cấu hình OTP qua SMS

Luồng đăng ký và quên mật khẩu sử dụng số điện thoại Việt Nam làm định danh. Email không còn là kênh xác minh tài khoản.

Email tại bước thanh toán, đơn hàng, liên hệ và thông tin hỗ trợ cửa hàng vẫn được giữ vì đó là dữ liệu liên hệ, không phải dữ liệu đăng nhập.

## Chế độ miễn phí cho phát triển và demo

Khi `NODE_ENV` khác `production`, backend tạo OTP, lưu bản băm và trả thêm trường `debugOtp` trong response. Giao diện hiển thị mã thử nghiệm bằng toast để hoàn thành luồng đăng ký mà không gửi SMS thật.

Frontend mock (`VITE_USE_MOCK=true`) dùng mã cố định `123456` và cũng không gọi dịch vụ bên ngoài.

Đây là giả lập SMS, không phải tin nhắn được gửi tới điện thoại. Không bật hoặc trả `debugOtp` trong production vì bất kỳ ai gọi API cũng có thể lấy mã xác minh.

## Gửi SMS thật

SMS thật cần hợp đồng/tài khoản và số dư của một nhà cung cấp SMS. Dự án hiện chưa gắn với nhà cung cấp nào để tránh phát sinh chi phí ngoài ý muốn.

Trong `production`, endpoint yêu cầu OTP sẽ trả `503` cho tới khi một SMS provider được tích hợp. Provider sau này phải được đặt sau `otpDeliveryService`, giữ nguyên các yêu cầu sau:

- Chỉ gửi mã sáu chữ số tới số điện thoại đã chuẩn hóa.
- Không log OTP, API key hoặc toàn bộ số điện thoại.
- Có timeout, ánh xạ lỗi an toàn và không tạo tài khoản khi gửi thất bại.
- Production không trả `debugOtp` và không tự chuyển sang email.

## Chuyển dữ liệu tài khoản cũ

Chạy dry-run trước:

```powershell
cd backend
npm run migrate:phone-auth
```

Nếu báo cáo không có số sai hoặc trùng sau chuẩn hóa, mới chạy ghi dữ liệu:

```powershell
npm run migrate:phone-auth -- --write
```

Migration giữ nguyên email cũ, chuẩn hóa số điện thoại, đánh dấu tài khoản hiện tại đã xác minh số và thay index email bằng index unique có điều kiện.

## Kiểm tra luồng miễn phí

1. Chạy backend với `NODE_ENV=development`.
2. Gọi `POST /api/auth/register/request-otp` bằng họ tên, số điện thoại và mật khẩu.
3. Lấy `debugOtp` từ response hoặc toast của frontend.
4. Gửi mã đó tới `POST /api/auth/register/verify-otp`.
5. Xác nhận tài khoản chỉ được tạo sau bước xác minh.
