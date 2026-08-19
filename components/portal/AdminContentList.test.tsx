import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminContentList from './AdminContentList';

const listDocuments = jest.fn();
const listVideos = jest.fn();
const updateDocument = jest.fn();
const updateVideo = jest.fn();
const deleteDocument = jest.fn();
const deleteVideo = jest.fn();
const removeDocStorage = jest.fn();
const removeVideoStorage = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'documents') {
        return {
          select: () => ({ order: (...args: unknown[]) => listDocuments(...args) }),
          update: (fields: unknown) => ({ eq: (...args: unknown[]) => updateDocument(fields, ...args) }),
          delete: () => ({ eq: (...args: unknown[]) => deleteDocument(...args) }),
        };
      }
      return {
        select: () => ({ order: (...args: unknown[]) => listVideos(...args) }),
        update: (fields: unknown) => ({ eq: (...args: unknown[]) => updateVideo(fields, ...args) }),
        delete: () => ({ eq: (...args: unknown[]) => deleteVideo(...args) }),
      };
    },
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) =>
          bucket === 'training-documents' ? removeDocStorage(paths) : removeVideoStorage(paths),
      }),
    },
  }),
}));

const oneDocument = {
  id: 'doc-1',
  title: 'Getting Started Guide',
  storage_path: 'abc/guide.pdf',
  file_size: 2048,
  content_type: 'application/pdf',
  uploaded_by: 'admin-1',
  created_at: '2026-08-01T00:00:00.000Z',
};

const oneVideo = {
  id: 'vid-1',
  title: 'Intro to the Portal',
  storage_path: 'abc/intro.mp4',
  thumbnail_path: 'abc/intro-thumb.jpg',
  uploaded_by: 'admin-1',
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('AdminContentList', () => {
  beforeEach(() => {
    listDocuments.mockReset();
    listVideos.mockReset();
    updateDocument.mockReset();
    updateVideo.mockReset();
    deleteDocument.mockReset();
    deleteVideo.mockReset();
    removeDocStorage.mockReset();
    removeVideoStorage.mockReset();
  });

  it('lists existing documents and videos', async () => {
    listDocuments.mockResolvedValueOnce({ data: [oneDocument] });
    listVideos.mockResolvedValueOnce({ data: [oneVideo] });

    render(<AdminContentList />);

    expect(await screen.findByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('Intro to the Portal')).toBeInTheDocument();
  });

  it('renames a document', async () => {
    listDocuments.mockResolvedValueOnce({ data: [oneDocument] });
    listVideos.mockResolvedValueOnce({ data: [] });
    updateDocument.mockResolvedValueOnce({ error: null });
    jest.spyOn(window, 'prompt').mockReturnValue('Updated Guide');

    const user = userEvent.setup();
    render(<AdminContentList />);
    await screen.findByText('Getting Started Guide');

    await user.click(screen.getAllByRole('button', { name: /rename/i })[0]);

    await waitFor(() =>
      expect(updateDocument).toHaveBeenCalledWith({ title: 'Updated Guide' }, 'id', 'doc-1')
    );
    expect(await screen.findByText('Updated Guide')).toBeInTheDocument();
    expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
  });

  it('deletes a document after confirmation, removing it from storage and the table', async () => {
    listDocuments.mockResolvedValueOnce({ data: [oneDocument] });
    listVideos.mockResolvedValueOnce({ data: [] });
    removeDocStorage.mockResolvedValueOnce({ error: null });
    deleteDocument.mockResolvedValueOnce({ error: null });
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(<AdminContentList />);
    await screen.findByText('Getting Started Guide');

    await user.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() => expect(removeDocStorage).toHaveBeenCalledWith(['abc/guide.pdf']));
    expect(deleteDocument).toHaveBeenCalledWith('id', 'doc-1');
    expect(screen.queryByText('Getting Started Guide')).not.toBeInTheDocument();
  });

  it('deletes a video, removing both its file and its thumbnail from storage', async () => {
    listDocuments.mockResolvedValueOnce({ data: [] });
    listVideos.mockResolvedValueOnce({ data: [oneVideo] });
    removeVideoStorage.mockResolvedValueOnce({ error: null });
    deleteVideo.mockResolvedValueOnce({ error: null });
    jest.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();
    render(<AdminContentList />);
    await screen.findByText('Intro to the Portal');

    await user.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() =>
      expect(removeVideoStorage).toHaveBeenCalledWith(['abc/intro.mp4', 'abc/intro-thumb.jpg'])
    );
    expect(deleteVideo).toHaveBeenCalledWith('id', 'vid-1');
    expect(screen.queryByText('Intro to the Portal')).not.toBeInTheDocument();
  });
});
