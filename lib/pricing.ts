export interface PricingPlan {
  id: string;
  label: string;
  price: string;
  billingNote: string;
  features: string[];
}

export const SETUP_FEE_CENTS = 25000;
export const MONTHLY_SUPPORT_CENTS = 5000;
export const HOURLY_RATE_STANDARD_CENTS = 17500;
export const HOURLY_RATE_WITH_PLAN_CENTS = 15000;

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function getPricingPlans(): PricingPlan[] {
  return [
    {
      id: 'setup',
      label: 'Initial Setup',
      price: `${formatCurrency(SETUP_FEE_CENTS)} one-time`,
      billingNote: 'One-time',
      features: [
        'All AI tools installed and configured',
        '1 hour of hands-on training',
        'A working baseline of commands, agents, and skills for your business',
      ],
    },
    {
      id: 'monthly',
      label: 'Monthly Support',
      price: `${formatCurrency(MONTHLY_SUPPORT_CENTS)}/month`,
      billingNote: 'Recurring',
      features: [
        'Submit support tickets anytime',
        'Request new features, agents, commands, and skills',
        'Discounted rate on additional training',
      ],
    },
    {
      id: 'hourly-standard',
      label: 'Hourly Rate',
      price: `${formatCurrency(HOURLY_RATE_STANDARD_CENTS)}/hour`,
      billingNote: 'Without a monthly plan',
      features: ['For extra work or training beyond initial setup'],
    },
    {
      id: 'hourly-plan',
      label: 'Hourly Rate (with Monthly Support)',
      price: `${formatCurrency(HOURLY_RATE_WITH_PLAN_CENTS)}/hour`,
      billingNote: 'Discounted for active subscribers',
      features: ['For extra work or training beyond initial setup'],
    },
  ];
}
