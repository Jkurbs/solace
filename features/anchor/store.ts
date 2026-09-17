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

const GITHUB_FETCH_MS = 1_500;

function githubHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'solace-anchor-reader',
  };

  if (json) {
    headers.Accept = 'application/vnd.github+json';
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchGithub(url: string, json = false) {
  return fetch(url, {
    headers: githubHeaders(json),
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(GITHUB_FETCH_MS),
  });
}

async function listRemoteAnchorNames(): Promise<string[] | null> {
  try {
    const listing = await fetchGithub(ANCHOR_REPO_CONTENTS, true);
    if (!listing.ok) {
      console.warn(`[anchor] Witness repo listing failed: HTTP ${listing.status}`);
      return null;
    }

    const entries = (await listing.json()) as Array<{ name?: string; type?: string }>;
    if (!Array.isArray(entries)) return null;

    return entries
      .filter((entry) => entry.type === 'file' && entry.name && ANCHOR_FILE_RE.test(entry.name))
      .map((entry) => entry.name as string)
      .sort();
  } catch (error) {
    console.warn('[anchor] Witness repo listing failed.', error);
    return null;
  }
}

async function fetchRemoteAnchorFile(name: string): Promise<ChainAnchor[]> {
  const response = await fetchGithub(`${ANCHOR_RAW_BASE}/${name}`);
  if (!response.ok) return [];
  return parseAnchorFile(await response.text());
}

async function listRemoteAnchors(): Promise<ChainAnchor[] | null> {
  try {
    const files = await listRemoteAnchorNames();
    if (!files?.length) return files ? [] : null;

    // Newest files are enough for the public "last anchored" label. Fetching
    // the whole witness repo on every Observatory load was hanging the page.
    const newest = files.slice(-8);
    const batches = await Promise.all(newest.map((name) => fetchRemoteAnchorFile(name)));
    return batches.flat();
  } catch (error) {
    console.warn('[anchor] Witness repo read failed.', error);
    return null;
  }
}

/** Latest witness only — one GitHub file, for ledger chrome that must not wait. */
export async function getLatestAnchorFast(): Promise<ChainAnchor | null> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.anchors[memoryCache.anchors.length - 1] ?? null;
  }

  const local = await listLocalAnchors();
  const localHead = local[local.length - 1] ?? null;

  try {
    const files = await listRemoteAnchorNames();
    const newest = files?.at(-1);
    const remote = newest ? await fetchRemoteAnchorFile(newest) : [];
    const head = mergeAnchors(local, remote).at(-1) ?? localHead;

    const merged = mergeAnchors(local, remote);
    if (merged.length) {
      memoryCache = { anchors: merged, expiresAt: Date.now() + CACHE_MS };
    }

    return merged.at(-1) ?? localHead;
  } catch (error) {
    console.warn('[anchor] Fast head read failed.', error);
    return localHead;
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
