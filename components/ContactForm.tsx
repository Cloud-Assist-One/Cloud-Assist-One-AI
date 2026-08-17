'use client';

import { useState, FormEvent } from 'react';
import styles from './ContactForm.module.css';
import { validateContactForm, ContactFormValues, ContactFormErrors } from '@/lib/validateContactForm';

const EMPTY_VALUES: ContactFormValues = {
  name: '',
  email: '',
  businessType: '',
  message: '',
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactForm() {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [status, setStatus] = useState<Status>('idle');

  function updateField(field: keyof ContactFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationErrors = validateContactForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const endpoint = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? '';

    if (!endpoint) {
      setStatus('error');
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('Form submission failed');
      }

      setStatus('success');
      setValues(EMPTY_VALUES);
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className={styles.section} id="contact">
      <h2>Get Started</h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            value={values.name}
            onChange={(e) => updateField('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && <p id="name-error" className={styles.error}>{errors.name}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => updateField('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && <p id="email-error" className={styles.error}>{errors.email}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="businessType">Business Type</label>
          <input
            id="businessType"
            value={values.businessType}
            onChange={(e) => updateField('businessType', e.target.value)}
            aria-invalid={Boolean(errors.businessType)}
            aria-describedby={errors.businessType ? 'businessType-error' : undefined}
          />
          {errors.businessType && <p id="businessType-error" className={styles.error}>{errors.businessType}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            rows={4}
            value={values.message}
            onChange={(e) => updateField('message', e.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? 'message-error' : undefined}
          />
          {errors.message && <p id="message-error" className={styles.error}>{errors.message}</p>}
        </div>

        <button className={styles.submit} type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Sending…' : 'Send'}
        </button>

        {status === 'success' && (
          <p className={styles.status} role="status">Thanks — we&apos;ll be in touch soon.</p>
        )}
        {status === 'error' && (
          <p className={styles.status} role="status">Something went wrong. Please try again or email us directly.</p>
        )}
      </form>
    </section>
  );
}
