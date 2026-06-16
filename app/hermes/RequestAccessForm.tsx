'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function RequestAccessForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitState === 'submitting') {
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(form.action, {
        body: formData,
        headers: {
          Accept: 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? 'Request could not be submitted.');
      }

      form.reset();
      setSubmitState('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Request could not be submitted.');
      setSubmitState('error');
      formRef.current?.querySelector<HTMLInputElement>('input, select, textarea')?.focus();
    }
  }

  return (
    <form
      ref={formRef}
      action="/api/hermes/request-access"
      method="post"
      className="hermes-access-form"
      onSubmit={handleSubmit}
    >
      <AnimatePresence mode="wait">
        {submitState === 'success' ? (
          <motion.div
            key="success"
            aria-live="polite"
            className="hermes-form-success"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span aria-hidden="true" />
            <p>Request received.</p>
            <h2>Hermes is currently being introduced in stages.</h2>
            <strong>We'll reach out if selected.</strong>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            className="hermes-access-form-inner"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28 }}
          >
            <h2>Interested in allocating capital with Hermes?</h2>

            <div className="hermes-form-grid">
              <div className="hermes-form-field">
                <label htmlFor="hermes-first-name">First name <i>*</i></label>
                <input id="hermes-first-name" name="firstName" type="text" autoComplete="given-name" required />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-last-name">Last name <i>*</i></label>
                <input id="hermes-last-name" name="lastName" type="text" autoComplete="family-name" required />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-email">Email address <i>*</i></label>
                <input id="hermes-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-phone">Phone number</label>
                <input id="hermes-phone" name="phone" type="tel" autoComplete="tel" />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-role">Role / title</label>
                <input id="hermes-role" name="role" type="text" autoComplete="organization-title" />
              </div>
              <div className="hermes-form-field">
                <label htmlFor="hermes-organization">Company / institution</label>
                <input id="hermes-organization" name="organization" type="text" autoComplete="organization" />
              </div>
              <div className="hermes-form-field hermes-form-full">
                <label htmlFor="hermes-country">Country <i>*</i></label>
                <select id="hermes-country" name="country" required defaultValue="">
                  <option value="" disabled>
                    Select...
                  </option>
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="European Union">European Union</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="hermes-form-field hermes-form-full">
                <label htmlFor="hermes-context">Capital context</label>
                <textarea
                  id="hermes-context"
                  name="context"
                  rows={4}
                  placeholder="Tell us what you want Hermes to help allocate, preserve, or monitor."
                />
              </div>
            </div>

            <div className="hermes-form-actions">
              <button type="submit" disabled={submitState === 'submitting'}>
                {submitState === 'submitting' ? 'Submitting' : 'Submit'}
              </button>
              <p>Access remains code-gated while Hermes is introduced in stages.</p>
              {submitState === 'error' ? (
                <p role="alert" className="hermes-form-error">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
