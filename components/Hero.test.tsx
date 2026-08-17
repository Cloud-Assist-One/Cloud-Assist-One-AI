import { render, screen } from '@testing-library/react';
import Hero from './Hero';

describe('Hero', () => {
  it('renders the main headline as an h1', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', { level: 1, name: /ai, set up and supported/i })
    ).toBeInTheDocument();
  });

  it('renders a CTA linking to the contact section', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: /get started/i })).toHaveAttribute('href', '#contact');
  });

  it('renders a CTA linking to the pricing section', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: /see pricing/i })).toHaveAttribute('href', '#pricing');
  });
});
