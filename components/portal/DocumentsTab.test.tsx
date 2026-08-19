import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentsTab from './DocumentsTab';

const order = jest.fn();
const createSignedUrl = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        order: (...args: unknown[]) => order(...args),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  }),
}));

describe('DocumentsTab', () => {
  beforeEach(() => {
    order.mockReset();
    createSignedUrl.mockReset();
  });

  it('shows an empty state when there are no documents', async () => {
    order.mockResolvedValueOnce({ data: [] });
    render(<DocumentsTab />);

    expect(await screen.findByText(/no documents available/i)).toBeInTheDocument();
  });

  it('lists documents and triggers a download via a signed URL', async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: 'doc-1',
          title: 'Getting Started Guide',
          storage_path: 'abc/guide.pdf',
          file_size: 2048,
          content_type: 'application/pdf',
          uploaded_by: 'admin-1',
          created_at: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'https://example.com/signed/guide.pdf' },
      error: null,
    });

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<DocumentsTab />);

    expect(await screen.findByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('2.0 KB')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /download/i }));

    await waitFor(() =>
      expect(createSignedUrl).toHaveBeenCalledWith('abc/guide.pdf', 60, {
        download: 'Getting Started Guide',
      })
    );
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('shows an error if the signed URL request fails', async () => {
    order.mockResolvedValueOnce({
      data: [
        {
          id: 'doc-1',
          title: 'Getting Started Guide',
          storage_path: 'abc/guide.pdf',
          file_size: 2048,
          content_type: 'application/pdf',
          uploaded_by: 'admin-1',
          created_at: '2026-08-01T00:00:00.000Z',
        },
      ],
    });
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    const user = userEvent.setup();
    render(<DocumentsTab />);

    await screen.findByText('Getting Started Guide');
    await user.click(screen.getByRole('button', { name: /download/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not download/i);
  });

  it('shows an error when the document list fails to load', async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    render(<DocumentsTab />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load documents/i);
  });
});
