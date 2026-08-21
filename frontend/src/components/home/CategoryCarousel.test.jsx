import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FiSmartphone } from 'react-icons/fi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CategoryCarousel from './CategoryCarousel';

const RESUME_DELAY = 3000;

const categories = [
  { name: 'iPhone', icon: FiSmartphone, query: 'Apple', color: 'blue' },
  { name: 'Samsung', icon: FiSmartphone, query: 'Samsung', color: 'violet' },
];

const setMotion = (matches) => {
  window.matchMedia = vi.fn(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('CategoryCarousel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders two continuous sets and hides the clone set from assistive technology', () => {
    setMotion(false);
    const { container } = render(
      <MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>,
    );

    const links = screen.getAllByText('iPhone').map((node) => node.closest('a'));
    const track = container.querySelector('.category-marquee-track');
    expect(links).toHaveLength(2);
    expect(links[0]).not.toHaveAttribute('aria-hidden');
    expect(links[1]).toHaveAttribute('aria-hidden', 'true');
    expect(links[1]).toHaveAttribute('tabindex', '-1');
    expect(track).toHaveClass('is-looping');
    expect(container.querySelectorAll('.category-marquee-set')).toHaveLength(2);
  });

  it('renders one static scrollable set when reduced motion is preferred', () => {
    setMotion(true);
    const { container } = render(
      <MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>,
    );

    expect(screen.getAllByText('iPhone')).toHaveLength(1);
    expect(container.querySelector('.category-marquee')).toHaveClass('is-static');
    expect(container.querySelector('.category-marquee-track')).not.toHaveClass('is-looping');
  });

  it('pauses the circular animation on hover and resumes after the delay', () => {
    setMotion(false);
    const { container } = render(
      <MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>,
    );
    const region = screen.getByRole('region');
    const track = container.querySelector('.category-marquee-track');

    fireEvent.mouseEnter(region);
    expect(track).toHaveClass('is-paused');
    fireEvent.mouseLeave(region);
    act(() => vi.advanceTimersByTime(2999));
    expect(track).toHaveClass('is-paused');
    act(() => vi.advanceTimersByTime(1));
    expect(track).not.toHaveClass('is-paused');
  });

  it('offers a persistent pause and resume control', () => {
    setMotion(false);
    const { container } = render(
      <MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>,
    );
    const pauseButton = screen.getByRole('button', { name: /tạm dừng danh mục/i });
    fireEvent.click(pauseButton);
    expect(container.querySelector('.category-marquee-track')).toHaveClass('is-paused');
    expect(screen.getByRole('button', { name: /tiếp tục danh mục/i })).toBeInTheDocument();
  });

  it('keeps a button pause in place even after the hover resume delay elapses', () => {
    setMotion(false);
    const { container } = render(
      <MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>,
    );
    const region = screen.getByRole('region');
    const track = container.querySelector('.category-marquee-track');

    fireEvent.click(screen.getByRole('button', { name: /tạm dừng danh mục/i }));
    fireEvent.mouseLeave(region);
    act(() => vi.advanceTimersByTime(RESUME_DELAY * 2));

    expect(track).toHaveClass('is-paused');
  });

  it('restarts the animation when the control is pressed again while still focused', () => {
    setMotion(false);
    const { container } = render(
      <MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>,
    );
    const track = container.querySelector('.category-marquee-track');

    fireEvent.click(screen.getByRole('button', { name: /tạm dừng danh mục/i }));
    expect(track).toHaveClass('is-paused');

    const resumeButton = screen.getByRole('button', { name: /tiếp tục danh mục/i });
    fireEvent.focus(resumeButton);
    fireEvent.click(resumeButton);

    expect(track).not.toHaveClass('is-paused');
    expect(resumeButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('omits the control when there is nothing animating', () => {
    setMotion(true);
    render(<MemoryRouter><CategoryCarousel categories={categories} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /danh mục tự trượt/i })).not.toBeInTheDocument();
  });
});
