'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './ResetPasswordForm.module.css';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      if (updateError.message.toLowerCase().includes('session')) {
        setError(
          'This reset link has expired or was opened in a different browser. Please request a new password reset email.'
        );
      } else {
        setError(updateError.message);
      }
      return;
    }

    setDone(true);
    router.push('/portal');
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h1>Set a new password</h1>

        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {done && (
          <p role="status" className={styles.status}>
            Password updated — redirecting…
          </p>
        )}

        <button type="submit" className={styles.submit}>
          Set password
        </button>
      </form>
    </div>
  );
}
