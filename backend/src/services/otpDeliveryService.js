const nodemailer = require('nodemailer');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};
const maskPhone = (phone) => `${phone.slice(0, 3)}***${phone.slice(-3)}`;
const normalizeVietnamesePhone = (phone) =>
  phone.startsWith('0') ? `+84${phone.slice(1)}` : phone;

class OtpDeliveryService {
  constructor() {
    this.transporter = env.smtp.host && env.smtp.user && env.smtp.pass
      ? nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      })
      : null;
  }

  async email(target, code, purpose) {
    if (this.transporter) {
      const title = purpose === 'register' ? 'Xác nhận đăng ký TechPhone' : 'Khôi phục mật khẩu TechPhone';
      await this.transporter.sendMail({
        from: env.smtp.from,
        to: target,
        subject: title,
        text: `Mã OTP của bạn là ${code}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
        html: `<p>Mã OTP TechPhone của bạn:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>`,
      });
    } else if (env.nodeEnv === 'production') {
      throw new AppError('Email OTP service is not configured', 503);
    } else {
      console.info(`[DEV OTP] ${purpose} email ${target}: ${code}`);
    }
    return maskEmail(target);
  }

  async sms(target, code, purpose) {
    if (env.twilio.accountSid && env.twilio.authToken && env.twilio.from) {
      const body = new URLSearchParams({
        To: normalizeVietnamesePhone(target),
        From: env.twilio.from,
        Body: `TechPhone OTP: ${code}. Ma co hieu luc trong 10 phut.`,
      });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        },
      );
      if (!response.ok) throw new AppError('SMS OTP could not be delivered', 502);
    } else if (env.nodeEnv === 'production') {
      throw new AppError('SMS OTP service is not configured', 503);
    } else {
      console.info(`[DEV OTP] ${purpose} sms ${target}: ${code}`);
    }
    return maskPhone(target);
  }

  async send(channel, target, code, purpose) {
    return channel === 'sms'
      ? this.sms(target, code, purpose)
      : this.email(target, code, purpose);
  }
}

module.exports = new OtpDeliveryService();
