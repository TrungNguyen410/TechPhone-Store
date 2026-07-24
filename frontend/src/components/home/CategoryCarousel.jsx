import { useEffect, useRef, useState } from 'react';
import { FiArrowRight } from 'react-icons/fi';
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
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  const looping = !reducedMotion && categories.length > 1;

  const pause = () => {
    clearTimeout(resumeRef.current);
    setPaused(true);
  };

  const resume = () => {
    clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_DELAY);
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
        className={`category-marquee-track${looping ? ' is-looping' : ''}${paused ? ' is-paused' : ''}`}
      >
        <div className="category-marquee-set">{renderCards()}</div>
        {looping && (
          <div className="category-marquee-set" aria-hidden="true">
            {renderCards(true)}
          </div>
        )}
      </div>
    </div>
  );
}
