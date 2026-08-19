import AdminUsers from './AdminUsers';
import AdminUpload from './AdminUpload';
import styles from './AdminTab.module.css';

export default function AdminTab() {
  return (
    <div className={styles.wrapper}>
      <section>
        <h2>Users</h2>
        <AdminUsers />
      </section>
      <section>
        <h2>Content</h2>
        <AdminUpload />
      </section>
    </div>
  );
}
