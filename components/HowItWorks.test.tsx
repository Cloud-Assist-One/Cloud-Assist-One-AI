import { render, screen } from '@testing-library/react';
import HowItWorks from './HowItWorks';

describe('HowItWorks', () => {
  it('renders a heading identifying the section', () => {
    render(<HowItWorks />);
    expect(screen.getByRole('heading', { name: /how it works/i })).toBeInTheDocument();
  });

  it('renders the four steps as an ordered list, in order', () => {
    render(<HowItWorks />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent(/setup call/i);
    expect(items[1]).toHaveTextContent(/install/i);
    expect(items[2]).toHaveTextContent(/training/i);
    expect(items[3]).toHaveTextContent(/ongoing support/i);
  });
});
