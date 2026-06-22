'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bug, Send } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { submitBugReport } from './queries';

type BugReproducibility = 'yes' | 'sometimes' | 'no' | 'unknown';

const reproducibilityOptions: Array<{ label: string; value: BugReproducibility }> = [
  { label: 'Yes', value: 'yes' },
  { label: 'Sometimes', value: 'sometimes' },
  { label: 'No', value: 'no' },
  { label: 'Unknown', value: 'unknown' },
];

function splitReproductionSteps(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function getDeviceContext() {
  if (typeof window === 'undefined') {
    return '';
  }

  return `${window.navigator.platform || 'Unknown platform'} · ${window.innerWidth}x${window.innerHeight} · ${window.devicePixelRatio}x`;
}

export default function IssueReportPanel() {
  const [canReproduce, setCanReproduce] = useState<BugReproducibility>('unknown');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [summary, setSummary] = useState('');
  const [whatHappened, setWhatHappened] = useState('');

  const bugReport = useMutation({
    mutationFn: submitBugReport,
    onMutate() {
      setStatusMessage('');
    },
    onError(error) {
      setStatusMessage(error.message);
    },
    onSuccess(payload) {
      const missingInfo = payload.missingInfo.length ? ` Missing: ${payload.missingInfo.join(', ')}.` : '';

      setStatusMessage(`${payload.message} Severity: ${payload.severity}.${missingInfo}`);
      setExpectedBehavior('');
      setScreenshotUrl('');
      setStepsToReproduce('');
      setSummary('');
      setWhatHappened('');
      setCanReproduce('unknown');
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (whatHappened.trim().length < 8) {
      setStatusMessage('Describe what happened before submitting.');
      return;
    }

    bugReport.mutate({
      browser: typeof window === 'undefined' ? undefined : window.navigator.userAgent,
      canReproduce,
      device: getDeviceContext(),
      expectedBehavior,
      pageUrl: typeof window === 'undefined' ? undefined : window.location.href,
      screenshotUrl,
      stepsToReproduce: splitReproductionSteps(stepsToReproduce),
      summary,
      whatHappened,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">BugOps</p>
            <CardTitle>Report issue</CardTitle>
          </div>
          <Badge variant="secondary">
            <Bug size={14} aria-hidden="true" />
            Beta
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Short title
              <input
                type="text"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="NAV did not update after pool selection"
                className="h-11 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Screenshot or recording URL
              <input
                type="url"
                value={screenshotUrl}
                onChange={(event) => setScreenshotUrl(event.target.value)}
                placeholder="https://..."
                className="h-11 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            What happened?
            <textarea
              required
              value={whatHappened}
              onChange={(event) => setWhatHappened(event.target.value)}
              rows={4}
              className="min-h-28 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Expected result
              <textarea
                value={expectedBehavior}
                onChange={(event) => setExpectedBehavior(event.target.value)}
                rows={3}
                className="min-h-24 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Steps to reproduce
              <textarea
                value={stepsToReproduce}
                onChange={(event) => setStepsToReproduce(event.target.value)}
                rows={3}
                placeholder="One step per line"
                className="min-h-24 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-50 dark:placeholder:text-neutral-600 dark:focus:border-neutral-600"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Can reproduce?</span>
              <div
                className="mt-2 grid gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900 sm:grid-cols-4"
                role="radiogroup"
                aria-label="Can reproduce issue"
              >
                {reproducibilityOptions.map((option) => {
                  const selected = option.value === canReproduce;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setCanReproduce(option.value)}
                      className={cn(
                        'inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
                        selected
                          ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-700 dark:text-neutral-50'
                          : 'text-neutral-600 hover:bg-white/70 hover:text-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50',
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button type="submit" disabled={bugReport.isPending} className="w-full md:w-auto">
              <Send size={16} aria-hidden="true" />
              {bugReport.isPending ? 'Submitting' : 'Submit issue'}
            </Button>
          </div>

          <p className="min-h-6 text-sm leading-6 text-neutral-500 dark:text-neutral-400" aria-live="polite">
            {statusMessage}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
