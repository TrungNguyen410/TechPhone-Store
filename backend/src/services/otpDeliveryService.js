const env = require('../config/env');
const AppError = require('../utils/AppError');
const { maskPhone } = require('../utils/phone');

class OtpDeliveryService {
  constructor({ config = env } = {}) {
    this.config = config;
  }

  async sms(target) {
    if (this.config.nodeEnv === 'production') {
      throw new AppError('Dịch vụ SMS thật chưa được cấu hình. Vui lòng thử lại sau.', 503);
    }

    return { deliveryTarget: maskPhone(target), trackingId: null };
  }

  async send(channel, target) {
    if (channel !== 'sms') throw new AppError('Kênh nhận OTP không được hỗ trợ', 422);
    return this.sms(target);
  }
}

module.exports = new OtpDeliveryService();
module.exports.OtpDeliveryService = OtpDeliveryService;
