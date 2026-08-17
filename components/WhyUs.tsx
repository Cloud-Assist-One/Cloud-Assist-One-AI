import styles from './WhyUs.module.css';

const VALUE_PROPS = [
  'Real, working AI tools — not just advice or a strategy deck.',
  'Ongoing support included with the monthly plan, not a one-and-done setup.',
  'A discounted rate on extra work when you are on the monthly plan.',
  'No technical background required — we handle the setup and teach you the basics.',
];

export default function WhyUs() {
  return (
    <section className={styles.section} id="why-us">
      <h2>
        Why <span className={styles.highlight}>Cloud Assist One</span>
      </h2>
      <div className={styles.grid}>
        {VALUE_PROPS.map((prop) => (
          <p key={prop}>{prop}</p>
        ))}
      </div>
    </section>
  );
}
