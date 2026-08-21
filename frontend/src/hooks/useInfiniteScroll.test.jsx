import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from './useInfiniteScroll';

let observers = [];

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }

  observe(node) { this.node = node; }

  disconnect() { observers = observers.filter((item) => item !== this); }

  trigger() { this.callback([{ isIntersecting: true, target: this.node }]); }
}

const scrollToBottom = () => act(() => { observers.at(-1)?.trigger(); });

function Harness({ items, pageSize = 9 }) {
  const { visibleItems, hasMore, observerRef } = useInfiniteScroll(items, pageSize);
  return (
    <div>
      <span data-testid="count">{visibleItems.length}</span>
      <span data-testid="more">{String(hasMore)}</span>
      <div ref={observerRef} />
    </div>
  );
}

const makeItems = (total) => Array.from({ length: total }, (_, index) => ({ id: `item-${index}` }));

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(cleanup);

  it('renders only the first page up front', () => {
    render(<Harness items={makeItems(25)} />);
    expect(screen.getByTestId('count')).toHaveTextContent('9');
    expect(screen.getByTestId('more')).toHaveTextContent('true');
  });

  it('appends one page each time the sentinel scrolls into view', () => {
    render(<Harness items={makeItems(25)} />);
    scrollToBottom();
    expect(screen.getByTestId('count')).toHaveTextContent('18');
    scrollToBottom();
    expect(screen.getByTestId('count')).toHaveTextContent('25');
    expect(screen.getByTestId('more')).toHaveTextContent('false');
  });

  it('never grows past the list length', () => {
    render(<Harness items={makeItems(4)} />);
    expect(screen.getByTestId('count')).toHaveTextContent('4');
    expect(screen.getByTestId('more')).toHaveTextContent('false');
  });

  it('rewinds to the first page when the list changes', () => {
    const { rerender } = render(<Harness items={makeItems(25)} />);
    scrollToBottom();
    expect(screen.getByTestId('count')).toHaveTextContent('18');
    rerender(<Harness items={makeItems(30)} />);
    expect(screen.getByTestId('count')).toHaveTextContent('9');
  });
});
