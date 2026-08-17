import styles from './Services.module.css';

const SERVICES = [
  {
    title: 'Install',
    body: 'We set up the AI tools your business needs, connected to how you already work.',
  },
  {
    title: 'Configure',
    body: 'We build the specific commands, agents, and skills that handle your day-to-day tasks.',
  },
  {
    title: 'Train',
    body: 'A hands-on session so your team knows exactly how to use what we built.',
  },
];

export default function Services() {
  return (
    <section className={styles.services} id="services">
      <h2>What&apos;s Included</h2>
      <div className={styles.grid}>
        {SERVICES.map((service) => (
          <div className={styles.card} key={service.title}>
            <h3>{service.title}</h3>
            <p>{service.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
