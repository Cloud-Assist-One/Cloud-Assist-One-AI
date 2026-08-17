import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Page from './page';

expect.extend(toHaveNoViolations);

describe('Homepage', () => {
  it('renders every section in the order defined by the PRD', async () => {
    const { container } = render(<Page />);

    const headings = screen.getAllByRole('heading', { level: 1 }).concat(
      screen.getAllByRole('heading', { level: 2 })
    );
    const headingText = headings.map((h) => h.textContent);

    expect(headingText).toEqual([
      'AI, Set Up and Supported — For Your Business',
      "What's Included",
      'How It Works',
      'Pricing',
      'Why Cloud Assist One',
      'Get Started',
    ]);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
