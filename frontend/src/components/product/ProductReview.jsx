import { useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { reviewApi } from '../../api/reviewApi';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatCurrency';
import EmptyState from '../common/EmptyState';

export default function ProductReview({ productId, onRequireLogin }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    reviewApi.getByProduct(productId).then(setReviews);
  }, [productId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isAuthenticated) return onRequireLogin();
    if (comment.trim().length < 10) return toast.error('Nội dung đánh giá cần ít nhất 10 ký tự');
    await reviewApi.create({
      productId,
      userId: user.id,
      userName: user.fullName,
      rating,
      comment: comment.trim(),
      status: 'pending',
    });
    setComment('');
    toast.success('Đánh giá đã được gửi và đang chờ duyệt');
  };

  return (
    <section className="product-reviews">
      <div className="section-heading"><div><span>Phản hồi thực tế</span><h2>Đánh giá sản phẩm</h2></div></div>
      <div className="review-layout">
        <form className="review-form panel" onSubmit={submit}>
          <h3>Chia sẻ trải nghiệm</h3>
          <label>Chọn số sao</label>
          <div className="star-picker">
            {[1, 2, 3, 4, 5].map((star) => (
              <button type="button" key={star} className={star <= rating ? 'active' : ''} onClick={() => setRating(star)}>
                <FiStar />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Sản phẩm này có điểm gì nổi bật?" rows="4" />
          <button className="btn btn-primary">Gửi đánh giá</button>
        </form>
        <div className="review-list">
          {reviews.length === 0 ? (
            <EmptyState title="Chưa có đánh giá" description="Hãy là người đầu tiên chia sẻ trải nghiệm." />
          ) : reviews.map((review) => (
            <article className="review-item" key={review.id}>
              <div className="review-avatar">{review.userName.charAt(0)}</div>
              <div>
                <div className="review-author"><strong>{review.userName}</strong><span>{formatDate(review.createdAt)}</span></div>
                <div className="review-stars">{Array.from({ length: 5 }, (_, index) => <FiStar key={index} className={index < review.rating ? 'filled' : ''} />)}</div>
                <p>{review.comment}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
