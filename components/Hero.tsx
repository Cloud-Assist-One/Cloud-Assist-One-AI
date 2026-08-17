import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero} id="top">
      <h1>
        AI, <span className={styles.highlight}>Set Up and Supported</span> — For Your Business
      </h1>
      <p>
        We install the AI tools, train your team, and build the exact commands and agents your
        business needs to run smoother — then stick around to support it.
      </p>
      <div className={styles.actions}>
        <a className={styles.primary} href="#contact">
          Get Started
        </a>
        <a className={styles.secondary} href="#pricing">
          See Pricing
        </a>
      </div>
    </section>
  );
}
