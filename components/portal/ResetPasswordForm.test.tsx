import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordForm from './ResetPasswordForm';

const updateUser = jest.fn();
const push = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: (...args: unknown[]) => updateUser(...args),
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => push(...args) }),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    updateUser.mockReset();
    push.mockReset();
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'short');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 8 characters/i);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('updates the password and redirects to the portal on success', async () => {
    updateUser.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/new password/i), 'a-long-enough-password');
    await user.click(screen.getByRole('button', { name: /set password/i }));

    expect(updateUser).toHaveBeenCalledWith({ password: 'a-long-enough-password' });
    expect(await screen.findByRole('status')).toHaveTextContent(/updated/i);
    expect(push).toHaveBeenCalledWith('/portal');
  });
});
