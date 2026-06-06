export const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidVietnamesePhone = (value = '') => /^(0[3|5|7|8|9])\d{8}$/.test(value.trim());
export const isStrongEnoughPassword = (value = '') => value.length >= 6;

export const validateRequired = (fields) =>
  Object.entries(fields).reduce((errors, [key, value]) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      errors[key] = 'Vui lòng nhập thông tin này';
    }
    return errors;
  }, {});
