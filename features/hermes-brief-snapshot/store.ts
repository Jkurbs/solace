import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { getRuntimeSnapshot, saveRuntimeSnapshot } from '@/features/runtime-snapshots/store';
import type { Json } from '@/lib/supabase/types';

import {
  fallbackHermesBriefSnapshot,
  normalizeHermesBriefSnapshot,
  type HermesBriefSnapshot,
} from './types';

const RUNTIME_SNAPSHOT_KEY = 'hermes_brief_snapshot';

type HermesBriefSnapshotGlobal = typeof globalThis & {
  __solaceHermesBriefSnapshot?: HermesBriefSnapshot;
};

function getBriefSnapshotPath() {
  return process.env.HERMES_PUBLIC_BRIEF_PATH
    ? resolve(process.env.HERMES_PUBLIC_BRIEF_PATH)
    : join(process.cwd(), '.hermes_state', 'brief_snapshot.json');
}

function getMemorySnapshot() {
  return (globalThis as HermesBriefSnapshotGlobal).__solaceHermesBriefSnapshot;
}

function setMemorySnapshot(snapshot: HermesBriefSnapshot) {
  (globalThis as HermesBriefSnapshotGlobal).__solaceHermesBriefSnapshot = snapshot;
}

export async function getStoredHermesBriefSnapshot() {
  // Durable layer first: survives serverless instances and deploys.
  const stored = await getRuntimeSnapshot(RUNTIME_SNAPSHOT_KEY);
  const durable = stored ? normalizeHermesBriefSnapshot(stored) : null;

  if (durable) {
    setMemorySnapshot(durable);
    return durable;
  }

  try {
    const raw = await readFile(getBriefSnapshotPath(), 'utf8');
    const snapshot = normalizeHermesBriefSnapshot(JSON.parse(raw));

    if (snapshot) {
      setMemorySnapshot(snapshot);
      return snapshot;
    }
  } catch {
    // Hermes writes this file or POSTs into this app; fallback keeps public reads stable before first publish.
  }

  return getMemorySnapshot() ?? fallbackHermesBriefSnapshot;
}

export async function saveHermesBriefSnapshot(value: unknown) {
  const snapshot = normalizeHermesBriefSnapshot(value);

  if (!snapshot) {
    return null;
  }

  setMemorySnapshot(snapshot);
  await saveRuntimeSnapshot(RUNTIME_SNAPSHOT_KEY, snapshot as unknown as Json);

  try {
    const targetPath = getBriefSnapshotPath();
    const tempPath = `${targetPath}.tmp`;

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    await rename(tempPath, targetPath);
  } catch (error) {
    console.warn('[hermes-brief-snapshot] File write failed.', error);
  }

  return snapshot;
}
