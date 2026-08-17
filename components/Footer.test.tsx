import { render, screen } from '@testing-library/react';
import Footer from './Footer';

describe('Footer', () => {
  it('renders the logo with alt text', () => {
    render(<Footer />);
    expect(screen.getByAltText('Cloud Assist One logo')).toBeInTheDocument();
  });

  it('renders a working mailto link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /info@cloudassistone\.com/i })).toHaveAttribute(
      'href',
      'mailto:info@cloudassistone.com'
    );
  });

  it('renders a working tel link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /407-388-4747/ })).toHaveAttribute(
      'href',
      'tel:+14073884747'
    );
  });

  it('renders the current year in the copyright line', () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
