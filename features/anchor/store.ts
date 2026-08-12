import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

import type { AnchorChain, ChainAnchor, HashVerification } from './types';
import { verifyAnchorContinuity, verifyHashInChain } from './protocol';

const ANCHOR_DIR = path.join(process.cwd(), 'public', 'anchor');

// The public witness is the dedicated repo, not this app's checked-in snapshot.
// Local public/anchor/ may only have the genesis file; newer seals land on GitHub.
const ANCHOR_REPO_CONTENTS =
  process.env.SOLACE_ANCHOR_SOURCE ??
  'https://api.github.com/repos/Solacefyi/anchor/contents';
const ANCHOR_RAW_BASE =
  process.env.SOLACE_ANCHOR_RAW ??
  'https://raw.githubusercontent.com/Solacefyi/anchor/main';

const CACHE_MS = 60_000;

// Matches legacy daily files (YYYY-MM-DD.json) and new timestamped files
// (YYYY-MM-DDTHH-MM-SS.json). Colons are replaced with dashes for filesystem safety.
const ANCHOR_FILE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}-\d{2}-\d{2})?\.json$/;

type AnchorCache = { expiresAt: number; anchors: ChainAnchor[] };
let memoryCache: AnchorCache | null = null;

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

function mergeAnchors(...lists: ChainAnchor[][]): ChainAnchor[] {
  const seen = new Set<string>();
  const merged: ChainAnchor[] = [];
  for (const list of lists) {
    for (const anchor of list) {
      const key = `${anchor.date}|${anchor.chainHead}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(anchor);
    }
  }
  return merged.sort(sortAnchors);
}

function filenameFromAnchorDate(date: string): string {
  const [day, time] = date.split('T');
  if (!time) return day;
  const [hh, mm, ss] = time.split(':');
  return `${day}T${hh}-${mm}-${(ss ?? '00').slice(0, 2)}`;
}

async function listLocalAnchors(): Promise<ChainAnchor[]> {
  try {
    const entries = await fs.readdir(ANCHOR_DIR);
    const files = entries.filter((f) => ANCHOR_FILE_RE.test(f));
    const anchors: ChainAnchor[] = [];
    for (const file of files) {
      const raw = await fs.readFile(path.join(ANCHOR_DIR, file), 'utf8');
      anchors.push(...parseAnchorFile(raw));
    }
    return anchors;
  } catch {
    return [];
  }
}

async function listRemoteAnchors(): Promise<ChainAnchor[] | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'solace-anchor-reader',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const listing = await fetch(ANCHOR_REPO_CONTENTS, {
      headers,
      next: { revalidate: 60 },
    });
    if (!listing.ok) {
      console.warn(`[anchor] Witness repo listing failed: HTTP ${listing.status}`);
      return null;
    }

    const entries = (await listing.json()) as Array<{ name?: string; type?: string }>;
    if (!Array.isArray(entries)) return null;

    const files = entries
      .filter((entry) => entry.type === 'file' && entry.name && ANCHOR_FILE_RE.test(entry.name))
      .map((entry) => entry.name as string);

    const batches = await Promise.all(
      files.map(async (name) => {
        const response = await fetch(`${ANCHOR_RAW_BASE}/${name}`, {
          headers: { 'User-Agent': 'solace-anchor-reader' },
          next: { revalidate: 60 },
        });
        if (!response.ok) return [] as ChainAnchor[];
        return parseAnchorFile(await response.text());
      }),
    );

    return batches.flat();
  } catch (error) {
    console.warn('[anchor] Witness repo read failed.', error);
    return null;
  }
}

export async function listAnchors(): Promise<ChainAnchor[]> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.anchors;
  }

  const [local, remote] = await Promise.all([listLocalAnchors(), listRemoteAnchors()]);
  const anchors = mergeAnchors(local, remote ?? []);

  memoryCache = { anchors, expiresAt: Date.now() + CACHE_MS };
  return anchors;
}

export async function getLatestAnchor(): Promise<ChainAnchor | null> {
  const anchors = await listAnchors();
  return anchors[anchors.length - 1] ?? null;
}

export async function getAnchorByDate(date: string): Promise<ChainAnchor | null> {
  const anchors = await listAnchors();
  const exact = anchors.find((anchor) => anchor.date === date);
  if (exact) return exact;

  const byFilename = anchors.find((anchor) => filenameFromAnchorDate(anchor.date) === date);
  if (byFilename) return byFilename;

  const prefix = date.slice(0, 10);
  const matches = anchors.filter((anchor) => anchor.date.slice(0, 10) === prefix);
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
