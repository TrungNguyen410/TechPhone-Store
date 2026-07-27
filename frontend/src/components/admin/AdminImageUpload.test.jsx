import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadApi } from '../../api/uploadApi';
import AdminImageUpload from './AdminImageUpload';

vi.mock('../../api/uploadApi', () => ({
  uploadApi: { adminImage: vi.fn() },
}));
vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AdminImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('uploads a selected local image and returns its URL', async () => {
    uploadApi.adminImage.mockResolvedValue({ url: 'http://localhost/uploads/admin/image.png' });
    const onChange = vi.fn();
    render(<AdminImageUpload label="Ảnh sản phẩm" onChange={onChange} />);

    const file = new File(['image'], 'phone.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Ảnh sản phẩm'), { target: { files: [file] } });

    await waitFor(() => expect(uploadApi.adminImage).toHaveBeenCalledWith(file));
    expect(onChange).toHaveBeenCalledWith('http://localhost/uploads/admin/image.png');
  });

  it('keeps selected image order and stops at five images', async () => {
    const existing = ['one.png', 'two.png', 'three.png', 'four.png'];
    uploadApi.adminImage.mockImplementation((file) =>
      Promise.resolve({ url: `http://localhost/uploads/admin/${file.name}` }));
    const onChange = vi.fn();
    render(
      <AdminImageUpload
        label="Ảnh sản phẩm"
        value={existing}
        onChange={onChange}
        multiple
        maxImages={5}
      />,
    );

    const firstSelected = new File(['five'], 'five.png', { type: 'image/png' });
    const overLimit = new File(['six'], 'six.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Ảnh sản phẩm'), {
      target: { files: [firstSelected, overLimit] },
    });

    await waitFor(() => expect(uploadApi.adminImage).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith([
      ...existing,
      'http://localhost/uploads/admin/five.png',
    ]);
  });
});
