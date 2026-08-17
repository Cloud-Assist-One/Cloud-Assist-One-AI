import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from './ContactForm';

describe('ContactForm', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('shows validation errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Business type is required.')).toBeInTheDocument();
    expect(screen.getByText('Message is required.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  function withFormEndpoint(value: string) {
    const originalEndpoint = process.env.NEXT_PUBLIC_FORM_ENDPOINT;
    process.env.NEXT_PUBLIC_FORM_ENDPOINT = value;
    return () => {
      if (originalEndpoint === undefined) {
        delete process.env.NEXT_PUBLIC_FORM_ENDPOINT;
      } else {
        process.env.NEXT_PUBLIC_FORM_ENDPOINT = originalEndpoint;
      }
    };
  }

  it('submits valid data to the form endpoint', async () => {
    const restoreEndpoint = withFormEndpoint('https://formspree.io/f/test123');
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'Jamie Rivera');
    await user.type(screen.getByLabelText(/email/i), 'jamie@example.com');
    await user.type(screen.getByLabelText(/business type/i), 'Salon');
    await user.type(screen.getByLabelText(/message/i), 'I want to automate bookings.');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText(/thanks.*we'll be in touch/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      'https://formspree.io/f/test123',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );

    restoreEndpoint();
  });

  it('shows an error and does not call fetch when the form endpoint is unset', async () => {
    const restoreEndpoint = withFormEndpoint('');
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'Jamie Rivera');
    await user.type(screen.getByLabelText(/email/i), 'jamie@example.com');
    await user.type(screen.getByLabelText(/business type/i), 'Salon');
    await user.type(screen.getByLabelText(/message/i), 'I want to automate bookings.');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(
      await screen.findByText(/something went wrong.*try again/i)
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    restoreEndpoint();
  });

  it('shows an error message when the submission fails', async () => {
    const restoreEndpoint = withFormEndpoint('https://formspree.io/f/test123');
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
    const user = userEvent.setup();
    render(<ContactForm />);

    await user.type(screen.getByLabelText(/name/i), 'Jamie Rivera');
    await user.type(screen.getByLabelText(/email/i), 'jamie@example.com');
    await user.type(screen.getByLabelText(/business type/i), 'Salon');
    await user.type(screen.getByLabelText(/message/i), 'I want to automate bookings.');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(
      await screen.findByText(/something went wrong.*try again/i)
    ).toBeInTheDocument();

    restoreEndpoint();
  });
});
