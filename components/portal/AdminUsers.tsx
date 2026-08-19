'use client';

import { useEffect, useState, FormEvent } from 'react';
import styles from './AdminUsers.module.css';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
  disabledAt: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    const response = await fetch('/api/portal/admin/users');
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not load users.');
      setLoading(false);
      return;
    }
    setUsers(body.users);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let generated = '';
    for (let i = 0; i < 16; i += 1) {
      generated += chars[Math.floor(Math.random() * chars.length)];
    }
    setPassword(generated);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    const response = await fetch('/api/portal/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    setCreating(false);
    if (!response.ok) {
      setError(body.error ?? 'Could not create user.');
      return;
    }
    setEmail('');
    setPassword('');
    await loadUsers();
  }

  async function handleToggleDisabled(user: AdminUser) {
    setError(null);
    const response = await fetch(`/api/portal/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !user.disabledAt }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not update user.');
      return;
    }
    await loadUsers();
  }

  async function handleDelete(user: AdminUser) {
    if (!window.confirm(`Permanently delete ${user.email}? This cannot be undone.`)) {
      return;
    }
    setError(null);
    const response = await fetch(`/api/portal/admin/users/${user.id}`, { method: 'DELETE' });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? 'Could not delete user.');
      return;
    }
    await loadUsers();
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleCreate}>
        <h3>Create user</h3>
        <label htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="new-user-password">Password</label>
        <div className={styles.passwordRow}>
          <input
            id="new-user-password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button type="button" onClick={generatePassword}>
            Generate
          </button>
        </div>
        <button type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create user'}
        </button>
      </form>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading users…</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.disabledAt ? 'Disabled' : 'Active'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button type="button" onClick={() => handleToggleDisabled(user)}>
                    {user.disabledAt ? 'Enable' : 'Disable'}
                  </button>
                  <button type="button" onClick={() => handleDelete(user)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
