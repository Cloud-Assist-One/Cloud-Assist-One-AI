import { render, screen } from '@testing-library/react';
import Pricing from './Pricing';

describe('Pricing', () => {
  it('renders a heading identifying the section', () => {
    render(<Pricing />);
    expect(screen.getByRole('heading', { name: /pricing/i })).toBeInTheDocument();
  });

  it('renders all four prices from the pricing module', () => {
    render(<Pricing />);
    expect(screen.getByText('$250 one-time')).toBeInTheDocument();
    expect(screen.getByText('$50/month')).toBeInTheDocument();
    expect(screen.getByText('$175/hour')).toBeInTheDocument();
    expect(screen.getByText('$150/hour')).toBeInTheDocument();
  });
});
