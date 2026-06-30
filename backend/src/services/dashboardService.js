const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

class DashboardService {
  async statistics() {
    const [products, orders, customers] = await Promise.all([
      Product.find({ isDeleted: false }),
      Order.find({ isDeleted: false }).sort({ createdAt: -1 }),
      User.find({ isDeleted: false, role: 'customer' }),
    ]);

    const completedOrders = orders.filter((order) => ['completed', 'delivered'].includes(order.status));
    const revenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
    const monthlyRevenue = Array.from({ length: 12 }, (_, monthIndex) => {
      const total = completedOrders
        .filter((order) => new Date(order.createdAt).getMonth() === monthIndex)
        .reduce((sum, order) => sum + order.total, 0);
      return Number((total / 1000000).toFixed(1));
    });

    const statusKeys = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

    return {
      stats: {
        products: products.length,
        orders: orders.length,
        customers: customers.length,
        revenue,
      },
      recentOrders: orders.slice(0, 5).map((order) => order.toJSON()),
      topProducts: products
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5)
        .map((product) => product.toJSON()),
      monthlyRevenue,
      orderStatus: statusKeys.map((status) => ({
        status,
        count: orders.filter((order) =>
          status === 'completed'
            ? ['completed', 'delivered'].includes(order.status)
            : order.status === status,
        ).length,
      })),
    };
  }
}

module.exports = new DashboardService();
