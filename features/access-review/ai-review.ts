import 'server-only';

import type {
  AccessReviewConfidence,
  AccessReviewRecommendation,
  AccessReviewResult,
  HermesAccessRequestInput,
} from './types';

const fallbackReviewModel = 'rules.v1';
const openAiEndpoint = 'https://api.openai.com/v1/responses';

function now() {
  return new Date().toISOString();
}

function normalizeList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
}

function normalizeRecommendation(value: unknown): AccessReviewRecommendation {
  return value === 'APPROVE' || value === 'DECLINE' || value === 'REVIEW' ? value : 'REVIEW';
}

function normalizeConfidence(value: unknown): AccessReviewConfidence {
  return value === 'LOW' || value === 'HIGH' || value === 'MEDIUM' ? value : 'MEDIUM';
}

function getSubmissionSummary(input: HermesAccessRequestInput) {
  return [
    `Name: ${input.firstName} ${input.lastName}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone || '-'}`,
    `Role: ${input.role || '-'}`,
    `Organization: ${input.organization || '-'}`,
    `Country: ${input.country}`,
    `Capital range: ${input.capitalRange || '-'}`,
    `Objective: ${input.objective || '-'}`,
    `Capital context: ${input.context || '-'}`,
  ].join('\n');
}

function fallbackReview(input: HermesAccessRequestInput, reason = 'OpenAI review is not configured.'): AccessReviewResult {
  const missingInfo: string[] = [];
  const riskFlags: string[] = [];
  const reasons: string[] = [];
  const context = input.context.toLowerCase();
  const objective = input.objective.toLowerCase();

  if (!input.capitalRange) {
    missingInfo.push('Capital range');
  }

  if (!input.objective) {
    missingInfo.push('Objective');
  }

  if (!input.context || input.context.length < 40) {
    missingInfo.push('More context on allocation objective');
  }

  if (/\bleverage\b|\bmargin\b|\bloan\b|\bborrow\b|\bguarantee\b|\bguaranteed\b|\bdouble\b|\bquick\b/.test(context)) {
    riskFlags.push('Submission uses language associated with leverage, guarantees, or short-term speculation.');
  }

  if (/\bday\b|\bshort[- ]?term\b|\bflip\b|\bquick\b|\bsignal\b/.test(context) || objective.includes('speculative')) {
    riskFlags.push('Objective may be more speculative than the Hermes allocation posture.');
  }

  if (missingInfo.length > 0) {
    reasons.push('The request needs more detail before account approval.');
  }

  if (riskFlags.length > 0) {
    reasons.push('Manual review is appropriate because the request contains potential risk flags.');
  }

  if (reasons.length === 0) {
    reasons.push('Submission includes the core information needed for an initial human review.');
  }

  return {
    confidence: missingInfo.length || riskFlags.length ? 'MEDIUM' : 'HIGH',
    missingInfo,
    model: fallbackReviewModel,
    recommendation: missingInfo.length || riskFlags.length ? 'REVIEW' : 'APPROVE',
    reasons: [reason, ...reasons].slice(0, 5),
    reviewedAt: now(),
    riskFlags,
    source: 'rules',
  };
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if ('output_text' in payload && typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const output = 'output' in payload && Array.isArray(payload.output) ? payload.output : [];

  for (const item of output) {
    if (!item || typeof item !== 'object' || !('content' in item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (content && typeof content === 'object' && 'text' in content && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return '';
}

function parseOpenAiReview(payload: unknown, model: string): AccessReviewResult {
  const text = extractOutputText(payload);
  const parsed = JSON.parse(text) as Record<string, unknown>;

  return {
    confidence: normalizeConfidence(parsed.confidence),
    missingInfo: normalizeList(parsed.missingInfo),
    model,
    recommendation: normalizeRecommendation(parsed.recommendation),
    reasons: normalizeList(parsed.reasons),
    reviewedAt: now(),
    riskFlags: normalizeList(parsed.riskFlags),
    source: 'openai',
  };
}

export async function generateAccessReview(input: HermesAccessRequestInput): Promise<AccessReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_ACCESS_REVIEW_MODEL ?? 'gpt-4.1-mini';

  if (!apiKey) {
    return fallbackReview(input);
  }

  try {
    const response = await fetch(openAiEndpoint, {
      body: JSON.stringify({
        input: [
          {
            content:
              'You are an internal access-review analyst for Solace Hermes. Provide a recommendation for human review only. Do not make final approval decisions. Evaluate clarity of intent, completeness, and operational risk. Avoid using protected traits. Return only the requested JSON shape.',
            role: 'system',
          },
          {
            content: getSubmissionSummary(input),
            role: 'user',
          },
        ],
        model,
        text: {
          format: {
            name: 'hermes_access_review',
            schema: {
              additionalProperties: false,
              properties: {
                confidence: { enum: ['LOW', 'MEDIUM', 'HIGH'], type: 'string' },
                missingInfo: {
                  items: { type: 'string' },
                  maxItems: 5,
                  type: 'array',
                },
                recommendation: { enum: ['APPROVE', 'REVIEW', 'DECLINE'], type: 'string' },
                reasons: {
                  items: { type: 'string' },
                  maxItems: 5,
                  minItems: 1,
                  type: 'array',
                },
                riskFlags: {
                  items: { type: 'string' },
                  maxItems: 5,
                  type: 'array',
                },
              },
              required: ['recommendation', 'confidence', 'reasons', 'missingInfo', 'riskFlags'],
              type: 'object',
            },
            strict: true,
            type: 'json_schema',
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      return fallbackReview(input, `OpenAI review failed with status ${response.status}.`);
    }

    return parseOpenAiReview(await response.json(), model);
  } catch (error) {
    return fallbackReview(input, error instanceof Error ? error.message : 'OpenAI review failed.');
  }
}
