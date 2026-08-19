import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUpload from './AdminUpload';

const upload = jest.fn();
const insert = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ upload: (...args: unknown[]) => upload(...args) }),
    },
    from: () => ({ insert: (...args: unknown[]) => insert(...args) }),
  }),
}));

describe('AdminUpload', () => {
  beforeEach(() => {
    upload.mockReset();
    insert.mockReset();
  });

  it('uploads a document and inserts its metadata', async () => {
    upload.mockResolvedValueOnce({ error: null });
    insert.mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    render(<AdminUpload />);

    const file = new File(['contents'], 'guide.pdf', { type: 'application/pdf' });
    await user.type(screen.getByLabelText(/^title$/i), 'Getting Started Guide');
    await user.upload(screen.getByLabelText(/^file$/i), file);
    await user.click(screen.getByRole('button', { name: /upload document/i }));

    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Getting Started Guide', content_type: 'application/pdf' })
    );
  });

  it('shows an error when the document upload fails', async () => {
    upload.mockResolvedValueOnce({ error: { message: 'storage error' } });

    const user = userEvent.setup();
    render(<AdminUpload />);

    const file = new File(['contents'], 'guide.pdf', { type: 'application/pdf' });
    await user.type(screen.getByLabelText(/^title$/i), 'Getting Started Guide');
    await user.upload(screen.getByLabelText(/^file$/i), file);
    await user.click(screen.getByRole('button', { name: /upload document/i }));

    expect(await screen.findByText('storage error')).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it('uploads a video without a thumbnail', async () => {
    upload.mockResolvedValueOnce({ error: null });
    insert.mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    render(<AdminUpload />);

    const file = new File(['contents'], 'intro.mp4', { type: 'video/mp4' });
    await user.type(screen.getByLabelText(/video title/i), 'Intro');
    await user.upload(screen.getByLabelText(/video file/i), file);
    await user.click(screen.getByRole('button', { name: /upload video/i }));

    await waitFor(() => expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Intro', thumbnail_path: null })
    ));
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
