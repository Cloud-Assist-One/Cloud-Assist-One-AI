import { render, screen } from '@testing-library/react';
import WhyUs from './WhyUs';

describe('WhyUs', () => {
  it('renders a heading identifying the section', () => {
    render(<WhyUs />);
    expect(screen.getByRole('heading', { name: /why cloud assist one/i })).toBeInTheDocument();
  });

  it('renders the four value props', () => {
    render(<WhyUs />);
    expect(screen.getByText(/real, working ai tools/i)).toBeInTheDocument();
    expect(screen.getByText(/ongoing support included/i)).toBeInTheDocument();
    expect(screen.getByText(/discounted rate/i)).toBeInTheDocument();
    expect(screen.getByText(/no technical background required/i)).toBeInTheDocument();
  });
});
