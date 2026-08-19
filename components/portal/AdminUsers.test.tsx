import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from './AdminUsers';

const usersResponse = {
  users: [
    { id: 'user-1', email: 'trainee@example.com', role: 'user', disabledAt: null, createdAt: '2026-08-01T00:00:00.000Z' },
  ],
};

describe('AdminUsers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('lists existing users', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => usersResponse,
    });

    render(<AdminUsers />);

    expect(await screen.findByText('trainee@example.com')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('creates a new user and refreshes the list', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => usersResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ user: { id: 'user-2', email: 'new@example.com' } }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            ...usersResponse.users,
            { id: 'user-2', email: 'new@example.com', role: 'user', disabledAt: null, createdAt: '2026-08-19T00:00:00.000Z' },
          ],
        }),
      });

    const user = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText('trainee@example.com');

    await user.type(screen.getByLabelText(/^email$/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'a-strong-password');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/portal/admin/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com', password: 'a-strong-password' }),
        })
      )
    );
    expect(await screen.findByText('new@example.com')).toBeInTheDocument();
  });

  it('disables a user', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => usersResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [{ ...usersResponse.users[0], disabledAt: '2026-08-19T00:00:00.000Z' }],
        }),
      });

    const user = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText('trainee@example.com');

    await user.click(screen.getByRole('button', { name: /^disable$/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/portal/admin/users/user-1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ disabled: true }) })
      )
    );
    expect(await screen.findByText('Disabled')).toBeInTheDocument();
  });

  it('deletes a user after confirmation', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => usersResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) });

    const user = userEvent.setup();
    render(<AdminUsers />);
    await screen.findByText('trainee@example.com');

    await user.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        '/api/portal/admin/users/user-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );
    expect(screen.queryByText('trainee@example.com')).not.toBeInTheDocument();
  });
});
