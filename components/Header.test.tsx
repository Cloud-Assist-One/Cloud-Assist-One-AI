import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';

describe('Header', () => {
  it('renders the logo with alt text', () => {
    render(<Header />);
    expect(screen.getByAltText('Cloud Assist One logo')).toBeInTheDocument();
  });

  it('renders nav links to each homepage section', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /services/i })).toHaveAttribute('href', '#services');
    expect(screen.getByRole('link', { name: /how it works/i })).toHaveAttribute('href', '#how-it-works');
    expect(screen.getByRole('link', { name: /pricing/i })).toHaveAttribute('href', '#pricing');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '#contact');
  });

  it('renders a Get Started CTA linking to the contact section', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '#contact');
  });

  it('toggles the mobile nav open and closed', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggle = screen.getByRole('button', { name: /menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
