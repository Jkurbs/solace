import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

// Durable persistence for singleton runtime documents (Hermes brief snapshot,
// public reading). File/memory layers in the feature stores remain as local
// fallbacks; this table is the layer that survives serverless instances.

function isMissingSnapshotTable(message: string) {
  return (
    message.includes('solace_runtime_snapshots') &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

export async function getRuntimeSnapshot(key: string): Promise<unknown> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('solace_runtime_snapshots')
      .select('payload')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      if (!isMissingSnapshotTable(error.message)) {
        console.warn('[runtime-snapshots] Read failed.', { error: error.message, key });
      }

      return null;
    }

    return data?.payload ?? null;
  } catch (error) {
    console.warn('[runtime-snapshots] Read failed.', { error, key });
    return null;
  }
}

export async function saveRuntimeSnapshot(key: string, payload: Json) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { error } = await supabase
      .from('solace_runtime_snapshots')
      .upsert({ key, payload, updated_at: new Date().toISOString() });

    if (error) {
      if (!isMissingSnapshotTable(error.message)) {
        console.warn('[runtime-snapshots] Write failed.', { error: error.message, key });
      }

      return false;
    }

    return true;
  } catch (error) {
    console.warn('[runtime-snapshots] Write failed.', { error, key });
    return false;
  }
}
