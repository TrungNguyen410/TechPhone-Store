# Cấu hình gửi OTP

Luồng đăng ký luôn yêu cầu xác minh email trước khi tạo tài khoản. Luồng quên mật khẩu hỗ trợ email hoặc SMS.

## Email

Điền các biến `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` và `SMTP_FROM` trong file `.env` ở thư mục gốc khi chạy Docker, hoặc trong `backend/.env` khi chạy backend trực tiếp.

Có thể dùng SMTP của Gmail, Outlook, Amazon SES, SendGrid hoặc nhà cung cấp SMTP tương thích. Với Gmail nên dùng App Password, không dùng mật khẩu tài khoản chính.

## SMS

Điền `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` và `TWILIO_FROM`. Số điện thoại Việt Nam bắt đầu bằng `0` được tự chuyển sang định dạng `+84` trước khi gửi.

## Môi trường phát triển

Khi chưa cấu hình nhà cung cấp và `NODE_ENV` không phải `production`, backend không gửi ra ngoài mà trả `debugOtp` và ghi mã vào log. Chế độ mock dùng mã `123456`.

Trong production, endpoint sẽ trả lỗi `503` nếu kênh được chọn chưa cấu hình, tránh hiển thị mã OTP ra client.
