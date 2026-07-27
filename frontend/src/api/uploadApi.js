import axiosClient from './axiosClient';
import { USE_MOCK } from '../utils/constants';

const uploadImage = (endpoint, fieldName, file) => {
  if (USE_MOCK) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        filename: file.name,
        field: fieldName,
        url: reader.result,
      });
      reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      reader.readAsDataURL(file);
    });
  }
  const formData = new FormData();
  formData.append(fieldName, file);
  return axiosClient.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const uploadApi = {
  adminImage: (file) => uploadImage('/uploads/admin', 'adminImage', file),
  reviewImage: (file) => uploadImage('/uploads/reviews', 'reviewImage', file),
};
