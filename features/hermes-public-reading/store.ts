import 'server-only';

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import {
  fallbackHermesPublicReading,
  normalizeHermesPublicReading,
  type HermesPublicReading,
  withFreshHermesPulse,
} from './types';

type HermesPublicReadingGlobal = typeof globalThis & {
  __solaceHermesPublicReading?: HermesPublicReading;
};

function getPublicReadingPath() {
  return process.env.HERMES_PUBLIC_READING_PATH
    ? resolve(process.env.HERMES_PUBLIC_READING_PATH)
    : join(process.cwd(), '.hermes_state', 'public_reading.json');
}

function getMemoryReading() {
  return (globalThis as HermesPublicReadingGlobal).__solaceHermesPublicReading;
}

function setMemoryReading(reading: HermesPublicReading) {
  (globalThis as HermesPublicReadingGlobal).__solaceHermesPublicReading = reading;
}

export async function getStoredHermesPublicReading(now = new Date()) {
  try {
    const raw = await readFile(getPublicReadingPath(), 'utf8');
    const reading = normalizeHermesPublicReading(JSON.parse(raw), now);

    if (reading) {
      setMemoryReading(reading);
      return reading;
    }
  } catch {
    // The public reading file is created by the Hermes bridge; fallback keeps the homepage renderable.
  }

  const memoryReading = getMemoryReading();

  if (memoryReading) {
    return withFreshHermesPulse(memoryReading, now);
  }

  return withFreshHermesPulse(fallbackHermesPublicReading, now);
}

export async function saveHermesPublicReading(value: unknown, now = new Date()) {
  const reading = normalizeHermesPublicReading(value, now);

  if (!reading) {
    return null;
  }

  setMemoryReading(reading);

  try {
    const targetPath = getPublicReadingPath();
    const tempPath = `${targetPath}.tmp`;

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify(reading, null, 2)}\n`, 'utf8');
    await rename(tempPath, targetPath);
  } catch (error) {
    console.warn('[hermes-public-reading] File write failed.', error);
  }

  return reading;
}
