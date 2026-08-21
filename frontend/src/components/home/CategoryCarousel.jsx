import { useEffect, useRef, useState } from 'react';
import { FiArrowRight, FiPause, FiPlay } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const RESUME_DELAY = 3000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const change = (event) => setReduced(event.matches);
    media.addEventListener?.('change', change);
    return () => media.removeEventListener?.('change', change);
  }, []);

  return reduced;
}

export default function CategoryCarousel({ categories }) {
  const resumeRef = useRef(null);
  // Tạm dừng tạm thời khi hover/focus, tự chạy lại sau RESUME_DELAY.
  const [hoverPaused, setHoverPaused] = useState(false);
  // Tạm dừng có chủ đích qua nút bấm: giữ nguyên cho đến khi người dùng bấm lại.
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const looping = !reducedMotion && categories.length > 1;
  const isPaused = hoverPaused || manuallyPaused || reducedMotion;

  const pause = () => {
    clearTimeout(resumeRef.current);
    setHoverPaused(true);
  };

  const resume = () => {
    clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setHoverPaused(false), RESUME_DELAY);
  };

  const toggle = () => {
    clearTimeout(resumeRef.current);
    const nextPaused = !manuallyPaused;
    setManuallyPaused(nextPaused);
    // Bam tiếp tục phải gỡ luôn hover-pause, vì chính nút này đang giữ focus.
    if (!nextPaused) setHoverPaused(false);
  };

  useEffect(() => () => clearTimeout(resumeRef.current), []);

  const renderCards = (clone = false) => categories.map((category) => {
    const { name, icon: Icon, query, path, color } = category;
    return (
      <Link
        key={name}
        to={path || `/products?brand=${query}`}
        className="category-card"
        aria-hidden={clone || undefined}
        tabIndex={clone ? -1 : undefined}
      >
        <div className={`category-icon ${color}`}><Icon /></div>
        <strong>{name}</strong>
        <span>Khám phá <FiArrowRight /></span>
      </Link>
    );
  });

  return (
    <div
      className={`category-marquee${looping ? '' : ' is-static'}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Danh mục nổi bật"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
    >
      <div
        className={`category-marquee-track${looping ? ' is-looping' : ''}${isPaused ? ' is-paused' : ''}`}
      >
        <div className="category-marquee-set">{renderCards()}</div>
        {looping && (
          <div className="category-marquee-set" aria-hidden="true">
            {renderCards(true)}
          </div>
        )}
      </div>
      {looping && (
        <button
          type="button"
          className="category-marquee-toggle"
          aria-pressed={manuallyPaused}
          aria-label={manuallyPaused ? 'Tiếp tục danh mục tự trượt' : 'Tạm dừng danh mục tự trượt'}
          onClick={toggle}
        >
          {manuallyPaused ? <FiPlay /> : <FiPause />}
          <span>{manuallyPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
        </button>
      )}
    </div>
  );
}
