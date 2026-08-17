import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <img src="/cao_ai_logo.png" alt="Cloud Assist One logo" width={102} height={112} />
      <p>Build. Optimize. Secure. Now with AI.</p>
      <p>
        <a href="mailto:info@cloudassistone.com">info@cloudassistone.com</a>
        {' · '}
        <a href="tel:+14073884747">407-388-4747</a>
      </p>
      <p>© {year} Cloud Assist One. All rights reserved.</p>
    </footer>
  );
}
