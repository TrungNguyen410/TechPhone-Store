const { OtpDeliveryService } = require('../src/services/otpDeliveryService');

describe('OtpDeliveryService', () => {
  it('simulates SMS delivery without an external request outside production', async () => {
    const service = new OtpDeliveryService({ config: { nodeEnv: 'development' } });

    await expect(service.send('sms', '0912345678', '654321')).resolves.toEqual({
      deliveryTarget: '091***678',
      trackingId: null,
    });
  });

  it('fails closed in production until a real SMS provider is configured', async () => {
    const service = new OtpDeliveryService({ config: { nodeEnv: 'production' } });

    await expect(service.send('sms', '0912345678', '654321')).rejects.toMatchObject({
      message: 'Dịch vụ SMS thật chưa được cấu hình. Vui lòng thử lại sau.',
      statusCode: 503,
    });
  });

  it('rejects unsupported OTP channels', async () => {
    const service = new OtpDeliveryService({ config: { nodeEnv: 'development' } });

    await expect(service.send('email', 'user@example.com', '654321')).rejects.toMatchObject({
      statusCode: 422,
    });
  });
});
