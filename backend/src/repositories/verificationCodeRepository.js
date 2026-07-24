const VerificationCode = require('../models/VerificationCode');

class VerificationCodeRepository {
  async replace({ target, purpose, channel, codeHash, payload, expiresAt }) {
    await VerificationCode.deleteMany({ target, purpose, consumedAt: null });
    return VerificationCode.create({ target, purpose, channel, codeHash, payload, expiresAt });
  }

  async findActive(target, purpose) {
    return VerificationCode.findOne({
      target,
      purpose,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('+codeHash').sort({ createdAt: -1 });
  }

  async incrementAttempts(id) {
    return VerificationCode.updateOne({ _id: id }, { $inc: { attempts: 1 } });
  }

  async consume(id) {
    return VerificationCode.updateOne({ _id: id }, { consumedAt: new Date() });
  }
}

module.exports = new VerificationCodeRepository();
