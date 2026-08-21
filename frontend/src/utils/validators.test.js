import { describe, expect, it } from 'vitest';
import {
  VIETNAM_MOBILE_PREFIXES,
  describePhoneError,
  isValidVietnamesePhone,
  normalizeVietnamesePhone,
} from './validators';

describe('Vietnamese phone validation', () => {
  it('accepts every prefix an operating carrier actually uses', () => {
    VIETNAM_MOBILE_PREFIXES.forEach((prefix) => {
      expect(isValidVietnamesePhone(`${prefix}1234567`)).toBe(true);
    });
  });

  it('rejects prefixes no carrier operates', () => {
    ['0123456789', '0201234567', '0951234567', '0601234567', '0401234567'].forEach((phone) => {
      expect(isValidVietnamesePhone(phone)).toBe(false);
    });
  });

  it('normalises +84 and 84 forms and strips separators', () => {
    expect(normalizeVietnamesePhone('+84912345678')).toBe('0912345678');
    expect(normalizeVietnamesePhone('84912345678')).toBe('0912345678');
    expect(normalizeVietnamesePhone('0912 345 678')).toBe('0912345678');
    expect(normalizeVietnamesePhone('091-234.5678')).toBe('0912345678');
  });

  it('rejects numbers of the wrong length', () => {
    expect(isValidVietnamesePhone('091234567')).toBe(false);
    expect(isValidVietnamesePhone('09123456789')).toBe(false);
  });

  it('explains why a number was rejected', () => {
    expect(describePhoneError('')).toMatch(/nhập số điện thoại/i);
    expect(describePhoneError('09abc12345')).toMatch(/chỉ được chứa chữ số/i);
    expect(describePhoneError('091234567')).toMatch(/10 chữ số/i);
    expect(describePhoneError('0123456789')).toMatch(/Đầu số 012/i);
    expect(describePhoneError('0912345678')).toBe('');
  });
});
