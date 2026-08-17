import styles from './HowItWorks.module.css';

const STEPS = [
  'Setup call — we learn about your business and what you need AI to handle.',
  'Install & configure — we set up the tools and build your custom commands, agents, and skills.',
  '1-hour training — your team learns how to use everything, hands-on.',
  'Ongoing support — submit tickets and request new tools anytime with a monthly plan.',
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works">
      <h2>How It Works</h2>
      <ol className={styles.steps}>
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  );
}
