'use client';

import { useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { waitlistCapitalRanges } from '@/features/access-review/capital-range';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function WaitlistForm() {
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
      const response = await fetch('/api/hermes/request-access', {
        body: formData,
        headers: { Accept: 'application/json' },
        method: 'POST',
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.message ??
            'The request did not reach us. Try again. If it repeats, email kerby@solace.fyi with your name and the amount you would consider.',
        );
      }

      form.reset();
      setSubmitState('success');
    } catch (error) {
      setSubmitState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The request did not reach us. Try again. If it repeats, email kerby@solace.fyi with your name and the amount you would consider.',
      );
      formRef.current?.querySelector<HTMLInputElement>('input, select, textarea')?.focus();
    }
  }

  if (submitState === 'success') {
    return (
      <div
        role="status"
        className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#0d0d0b] sm:p-8"
      >
        <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
          Waitlist
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50">
          Request received.
        </h1>
        <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
          Hermes is being introduced in stages. We’ll reach out if a place opens. You don’t need to do anything else.
        </p>
      </div>
    );
  }

  const fieldClass =
    'mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-100';
  const labelClass = 'text-sm font-medium text-neutral-800 dark:text-neutral-200';

  return (
    <form
      ref={formRef}
      action="/api/hermes/request-access"
      method="post"
      className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-[#0d0d0b] sm:p-8"
      onSubmit={handleSubmit}
    >
      <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
        Waitlist
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-normal text-neutral-950 dark:text-neutral-50">
        Join the waitlist
      </h1>
      <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-400">
        Hermes runs on founder capital. You cannot invest yet. Leave your name if you want to be considered when a
        place opens.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          First name
          <input className={fieldClass} name="firstName" type="text" autoComplete="given-name" required />
        </label>
        <label className={labelClass}>
          Last name
          <input className={fieldClass} name="lastName" type="text" autoComplete="family-name" required />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Email
          <input className={fieldClass} name="email" type="email" autoComplete="email" required />
        </label>
        <label className={`${labelClass} sm:col-span-2`}>
          Amount you would consider
          <select className={fieldClass} name="capitalRange" required defaultValue="">
            <option value="" disabled>
              Select
            </option>
            {waitlistCapitalRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input type="hidden" name="source" value="waitlist" />

      {submitState === 'error' ? (
        <p className="mt-4 text-sm leading-6 text-red-700 dark:text-red-300" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="mt-8 w-full sm:w-auto" disabled={submitState === 'submitting'}>
        {submitState === 'submitting' ? 'Sending' : 'Join the waitlist'}
      </Button>
    </form>
  );
}
