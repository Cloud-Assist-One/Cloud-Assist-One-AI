import { render, screen } from '@testing-library/react';
import Services from './Services';

describe('Services', () => {
  it('renders a heading identifying the section', () => {
    render(<Services />);
    expect(screen.getByRole('heading', { name: /what's included/i })).toBeInTheDocument();
  });

  it('renders the three service items', () => {
    render(<Services />);
    expect(screen.getByRole('heading', { name: /install/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /configure/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /train/i })).toBeInTheDocument();
  });
});
