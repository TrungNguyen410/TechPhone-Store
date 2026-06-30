import axiosClient from './axiosClient';

const uploadImage = (endpoint, fieldName, file) => {
  const formData = new FormData();
  formData.append(fieldName, file);
  return axiosClient.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const uploadApi = {
  reviewImage: (file) => uploadImage('/uploads/reviews', 'reviewImage', file),
};
