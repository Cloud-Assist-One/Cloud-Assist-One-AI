import { formatCurrency, getPricingPlans } from './pricing';

describe('formatCurrency', () => {
  it('formats whole-dollar cents as USD with no decimals', () => {
    expect(formatCurrency(25000)).toBe('$250');
  });
});

describe('getPricingPlans', () => {
  it('returns exactly 4 plans in setup, monthly, hourly-standard, hourly-plan order', () => {
    const plans = getPricingPlans();
    expect(plans.map((p) => p.id)).toEqual([
      'setup',
      'monthly',
      'hourly-standard',
      'hourly-plan',
    ]);
  });

  it('matches the PRD pricing exactly', () => {
    const plans = getPricingPlans();
    expect(plans[0].price).toBe('$250 one-time');
    expect(plans[1].price).toBe('$50/month');
    expect(plans[2].price).toBe('$175/hour');
    expect(plans[3].price).toBe('$150/hour');
  });
});
