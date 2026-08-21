export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/**
 * Đầu số di động đang được các nhà mạng Việt Nam vận hành (sau chuyển đổi 11 -> 10 số).
 * Viettel: 032-039, 086, 096-098 | VinaPhone: 081-085, 088, 091, 094
 * MobiFone: 070, 076-079, 089, 090, 093 | Vietnamobile: 052, 056, 058, 092
 * Gmobile: 059, 099 | iTel: 087 | Wintel: 055
 */
export const VIETNAM_MOBILE_PREFIXES = [
  '032', '033', '034', '035', '036', '037', '038', '039',
  '052', '055', '056', '058', '059',
  '070', '076', '077', '078', '079',
  '081', '082', '083', '084', '085', '086', '087', '088', '089',
  '090', '091', '092', '093', '094', '096', '097', '098', '099',
];

const VIETNAM_MOBILE_PATTERN = /^0(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/;

export const normalizeVietnamesePhone = (value = '') => {
  let phone = String(value).trim().replace(/[\s().-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length === 11) phone = `0${phone.slice(2)}`;
  return VIETNAM_MOBILE_PATTERN.test(phone) ? phone : null;
};

export const isValidVietnamesePhone = (value = '') => Boolean(normalizeVietnamesePhone(value));

/** Thông báo lỗi cụ thể để người dùng biết sai ở đâu. */
export const describePhoneError = (value = '') => {
  const raw = String(value).trim().replace(/[\s().-]/g, '');
  if (!raw) return 'Vui lòng nhập số điện thoại';
  if (/[^\d+]/.test(raw)) return 'Số điện thoại chỉ được chứa chữ số';
  let phone = raw;
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length === 11) phone = `0${phone.slice(2)}`;
  if (phone.length !== 10) return 'Số điện thoại phải gồm 10 chữ số';
  if (!VIETNAM_MOBILE_PATTERN.test(phone)) {
    return `Đầu số ${phone.slice(0, 3)} không thuộc nhà mạng nào đang hoạt động tại Việt Nam`;
  }
  return '';
};

export const isStrongEnoughPassword = (value = '') => value.length >= 6;

export const validateRequired = (fields) =>
  Object.entries(fields).reduce((errors, [key, value]) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      errors[key] = 'Vui lòng nhập thông tin này';
    }
    return errors;
  }, {});
