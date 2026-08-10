import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type { AnchorChain, ChainAnchor, HashVerification } from './types';
import { verifyAnchorContinuity, verifyHashInChain } from './protocol';

const ANCHOR_DIR = path.join(process.cwd(), 'public', 'anchor');

// Matches legacy daily files (YYYY-MM-DD.json) and new timestamped files
// (YYYY-MM-DDTHH-MM-SS.json). Colons are replaced with dashes for filesystem safety.
const ANCHOR_FILE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}-\d{2}-\d{2})?\.json$/;

function parseAnchorRecord(data: unknown): ChainAnchor {
  const record = data as Record<string, unknown>;
  return {
    date: String(record.date),
    chainHead: String(record.chain_head),
    rowNumber: Number(record.row_number),
    sealedAt: String(record.sealed_at),
    previousAnchor: record.previous_anchor ? String(record.previous_anchor) : null,
    sourceUrl: String(record.source_url),
  };
}

function parseAnchorFile(raw: string): ChainAnchor[] {
  const data = JSON.parse(raw);
  // New daily files are arrays; legacy files are single objects.
  const records = Array.isArray(data) ? data : [data];
  return records.map(parseAnchorRecord);
}

function sortAnchors(a: ChainAnchor, b: ChainAnchor): number {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return (a.sealedAt ?? '').localeCompare(b.sealedAt ?? '');
}

export async function listAnchors(): Promise<ChainAnchor[]> {
  try {
    const entries = await fs.readdir(ANCHOR_DIR);
    const files = entries.filter((f) => ANCHOR_FILE_RE.test(f));
    const anchors: ChainAnchor[] = [];
    for (const file of files) {
      const raw = await fs.readFile(path.join(ANCHOR_DIR, file), 'utf8');
      anchors.push(...parseAnchorFile(raw));
    }
    return anchors.sort(sortAnchors);
  } catch {
    return [];
  }
}

export async function getLatestAnchor(): Promise<ChainAnchor | null> {
  const anchors = await listAnchors();
  return anchors[anchors.length - 1] ?? null;
}

export async function getAnchorByDate(date: string): Promise<ChainAnchor | null> {
  const anchors = await listAnchors();
  const prefix = date.slice(0, 10);
  const matches = anchors.filter((a) => a.date.slice(0, 10) === prefix);
  return matches[matches.length - 1] ?? null;
}

export async function getAnchorChain(): Promise<AnchorChain> {
  const anchors = await listAnchors();
  const { ok, breaks } = verifyAnchorContinuity(anchors);
  return {
    anchors,
    head: anchors[anchors.length - 1] ?? null,
    count: anchors.length,
    verified: ok,
    breaks,
  };
}

export async function verifyHash(hash: string): Promise<HashVerification> {
  const anchors = await listAnchors();
  return verifyHashInChain(hash, anchors);
}
