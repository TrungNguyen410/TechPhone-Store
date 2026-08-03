const AppError = require('../utils/AppError');
const reviewRepository = require('../repositories/reviewRepository');
const orderRepository = require('../repositories/orderRepository');

class ReviewService {
  async listPublic() {
    return reviewRepository.findAll({ status: 'approved' }, { sort: { createdAt: -1 } });
  }

  async listAdmin() {
    return reviewRepository.findAll({}, { sort: { createdAt: -1 } });
  }

  async getByProduct(productId) {
    return reviewRepository.findAll({ productId, status: 'approved' }, { sort: { createdAt: -1 } });
  }

  async getByAccessory(accessoryId) {
    return reviewRepository.findAll({ accessoryId, status: 'approved' }, { sort: { createdAt: -1 } });
  }

  async create(payload, user) {
    const userId = user?.id || payload.userId;
    const productId = payload.productId || 'general';
    const accessoryId = payload.accessoryId || null;
    let verifiedPurchase = false;
    if (accessoryId || productId !== 'general') {
      const orders = await orderRepository.findAll({ userId }, { sort: { createdAt: -1 } });
      verifiedPurchase = orders.some((order) =>
        ['delivered', 'completed'].includes(order.status)
        && order.items.some((item) =>
          (accessoryId && item.accessoryId === accessoryId)
          || (!accessoryId && item.productId === productId)),
      );
    }
    const existingReview = await reviewRepository.findByUserAndTarget(userId, { productId, accessoryId });
    if (existingReview) {
      throw new AppError('Bạn đã đánh giá mặt hàng này rồi', 409);
    }

    try {
      return await reviewRepository.create({
        ...payload,
        userId,
        userName: user?.fullName || payload.userName,
        productId,
        accessoryId,
        images: Array.isArray(payload.images) ? payload.images.slice(0, 5) : [],
        verifiedPurchase,
        status: 'pending',
      });
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError('Bạn đã đánh giá mặt hàng này rồi', 409);
      }
      throw error;
    }
  }

  async update(id, payload) {
    return reviewRepository.update(id, payload);
  }

  async approve(id) {
    return reviewRepository.update(id, { status: 'approved' });
  }

  async reject(id) {
    return reviewRepository.update(id, { status: 'rejected' });
  }

  async remove(id) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError('Không tìm thấy đánh giá', 404);
    return reviewRepository.softDelete(id);
  }
}

module.exports = new ReviewService();
