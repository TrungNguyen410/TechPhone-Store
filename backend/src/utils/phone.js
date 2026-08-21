// Dau so di dong dang duoc cac nha mang Viet Nam van hanh (10 so).
// Viettel 032-039/086/096-098, VinaPhone 081-085/088/091/094,
// MobiFone 070/076-079/089/090/093, Vietnamobile 052/056/058/092,
// Gmobile 059/099, iTel 087, Wintel 055.
const VIETNAMESE_MOBILE_PATTERN = /^0(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/;

const digitsOnly = (value) => String(value || '').trim().replace(/[\s().-]/g, '');

const normalizeVietnamesePhone = (value) => {
  let phone = digitsOnly(value);
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84') && phone.length === 11) phone = `0${phone.slice(2)}`;
  if (!VIETNAMESE_MOBILE_PATTERN.test(phone)) return null;
  return phone;
};

const maskPhone = (value) => {
  const phone = normalizeVietnamesePhone(value) || String(value || '');
  return phone.length >= 6 ? `${phone.slice(0, 3)}***${phone.slice(-3)}` : '***';
};

module.exports = {
  VIETNAMESE_MOBILE_PATTERN,
  maskPhone,
  normalizeVietnamesePhone,
};
