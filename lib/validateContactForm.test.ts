import { validateContactForm, ContactFormValues } from './validateContactForm';

const validValues: ContactFormValues = {
  name: 'Jamie Rivera',
  email: 'jamie@example.com',
  businessType: 'Salon',
  message: 'I want to automate my booking confirmations.',
};

describe('validateContactForm', () => {
  it('returns no errors for fully valid input', () => {
    expect(validateContactForm(validValues)).toEqual({});
  });

  it('requires name', () => {
    const errors = validateContactForm({ ...validValues, name: '  ' });
    expect(errors.name).toBe('Name is required.');
  });

  it('requires email', () => {
    const errors = validateContactForm({ ...validValues, email: '' });
    expect(errors.email).toBe('Email is required.');
  });

  it('rejects a malformed email', () => {
    const errors = validateContactForm({ ...validValues, email: 'not-an-email' });
    expect(errors.email).toBe('Enter a valid email address.');
  });

  it('requires business type', () => {
    const errors = validateContactForm({ ...validValues, businessType: '' });
    expect(errors.businessType).toBe('Business type is required.');
  });

  it('requires message', () => {
    const errors = validateContactForm({ ...validValues, message: '' });
    expect(errors.message).toBe('Message is required.');
  });
});
