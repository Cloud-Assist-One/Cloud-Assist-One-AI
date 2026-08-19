import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideosTab from './VideosTab';

const videosOrder = jest.fn();
const watchesEq = jest.fn();
const createSignedUrl = jest.fn();
const insertWatch = jest.fn();
const deleteWatch = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'videos') {
        return { select: () => ({ order: (...args: unknown[]) => videosOrder(...args) }) };
      }
      // video_watches
      return {
        select: () => ({ eq: (...args: unknown[]) => watchesEq(...args) }),
        insert: (...args: unknown[]) => insertWatch(...args),
        delete: () => ({
          eq: () => ({
            eq: (...args: unknown[]) => deleteWatch(...args),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => createSignedUrl(...args),
      }),
    },
  }),
}));

describe('VideosTab', () => {
  beforeEach(() => {
    videosOrder.mockReset();
    watchesEq.mockReset();
    createSignedUrl.mockReset();
    insertWatch.mockReset();
    deleteWatch.mockReset();
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.mp4' }, error: null });
  });

  it('shows an empty state when there are no videos', async () => {
    videosOrder.mockResolvedValueOnce({ data: [] });
    watchesEq.mockResolvedValueOnce({ data: [] });
    render(<VideosTab userId="user-1" />);

    expect(await screen.findByText(/no videos available/i)).toBeInTheDocument();
  });

  it('renders a grid of videos and marks a video as watched', async () => {
    videosOrder.mockResolvedValueOnce({
      data: [
        { id: 'vid-1', title: 'Intro', storage_path: 'v1.mp4', thumbnail_path: null, uploaded_by: 'admin-1', created_at: '2026-08-01T00:00:00.000Z' },
      ],
    });
    watchesEq.mockResolvedValueOnce({ data: [] });
    insertWatch.mockResolvedValueOnce({ error: null });

    const user = userEvent.setup();
    render(<VideosTab userId="user-1" />);

    expect(await screen.findByText('Intro')).toBeInTheDocument();
    expect(screen.queryByText('Watched')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mark as watched/i }));

    await waitFor(() => expect(insertWatch).toHaveBeenCalledWith({ user_id: 'user-1', video_id: 'vid-1' }));
    expect(await screen.findByText('Watched')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as unwatched/i })).toBeInTheDocument();
  });

  it('opens the player modal when a thumbnail is clicked', async () => {
    videosOrder.mockResolvedValueOnce({
      data: [
        { id: 'vid-1', title: 'Intro', storage_path: 'v1.mp4', thumbnail_path: null, uploaded_by: 'admin-1', created_at: '2026-08-01T00:00:00.000Z' },
      ],
    });
    watchesEq.mockResolvedValueOnce({ data: [] });

    const user = userEvent.setup();
    render(<VideosTab userId="user-1" />);

    await screen.findByText('Intro');
    await user.click(screen.getByRole('button', { name: /play intro/i }));

    expect(await screen.findByRole('dialog', { name: 'Intro' })).toBeInTheDocument();
  });

  it('shows an error when videos fail to load', async () => {
    videosOrder.mockResolvedValueOnce({ data: null, error: { message: 'permission denied' } });
    watchesEq.mockResolvedValueOnce({ data: [] });
    render(<VideosTab userId="user-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load videos/i);
  });
});
