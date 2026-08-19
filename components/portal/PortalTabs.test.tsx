import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PortalTabs from './PortalTabs';

jest.mock('./DocumentsTab', () => ({
  __esModule: true,
  default: () => <div>documents-tab-content</div>,
}));
jest.mock('./VideosTab', () => ({
  __esModule: true,
  default: ({ userId }: { userId: string }) => <div>videos-tab-content for {userId}</div>,
}));
jest.mock('./AdminTab', () => ({
  __esModule: true,
  default: () => <div>admin-tab-content</div>,
}));

const signOut = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: (...args: unknown[]) => signOut(...args),
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe('PortalTabs', () => {
  beforeEach(() => {
    signOut.mockReset();
  });

  it('shows the Documents tab by default and hides Admin for a regular user', () => {
    render(<PortalTabs userId="user-1" role="user" />);

    expect(screen.getByText('documents-tab-content')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('switches to the Videos tab when clicked', async () => {
    const user = userEvent.setup();
    render(<PortalTabs userId="user-1" role="user" />);

    await user.click(screen.getByRole('tab', { name: /videos/i }));

    expect(screen.getByText('videos-tab-content for user-1')).toBeInTheDocument();
  });

  it('shows the Admin tab for an admin and can switch to it', async () => {
    const user = userEvent.setup();
    render(<PortalTabs userId="admin-1" role="admin" />);

    const adminTab = screen.getByRole('tab', { name: /admin/i });
    await user.click(adminTab);

    expect(screen.getByText('admin-tab-content')).toBeInTheDocument();
  });

  it('shows a link back to the marketing site', () => {
    render(<PortalTabs userId="user-1" role="user" />);

    expect(screen.getByRole('link', { name: /back to site/i })).toHaveAttribute('href', '/');
  });

  it('signs the user out when Sign out is clicked', async () => {
    signOut.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<PortalTabs userId="user-1" role="user" />);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOut).toHaveBeenCalled();
  });
});
