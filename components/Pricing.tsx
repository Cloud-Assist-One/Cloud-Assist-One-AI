import styles from './Pricing.module.css';
import { getPricingPlans } from '@/lib/pricing';

export default function Pricing() {
  const plans = getPricingPlans();

  return (
    <section className={styles.section} id="pricing">
      <h2>Pricing</h2>
      <div className={styles.grid}>
        {plans.map((plan) => (
          <div className={styles.card} key={plan.id}>
            <h3>{plan.label}</h3>
            <p className={styles.price}>{plan.price}</p>
            <p className={styles.note}>{plan.billingNote}</p>
            <ul className={styles.features}>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
