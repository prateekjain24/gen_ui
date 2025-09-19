#!/usr/bin/env bun

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { EvalLogRecord } from '../src/lib/llm/eval-logger';

interface SyncStateEntry {
  recordId: string;
  syncedAt: string;
  sourceFile: string;
}

type SyncState = Record<string, SyncStateEntry>;

const LOG_DIR = resolveLogDir();
const SYNC_STATE_PATH = path.join(LOG_DIR, '.airtable-sync.json');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = (process.env.AIRTABLE_TABLE_NAME ?? 'llm_decisions').trim();

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables.');
  process.exit(1);
}

async function main() {
  const [records, syncState] = await Promise.all([loadEvalRecords(), readSyncState()]);
  const pending = records.filter(record => !syncState[record.record.decisionId]);

  if (pending.length === 0) {
    process.stdout.write('No new eval decisions to sync.\n');
    return;
  }

  process.stdout.write(`Preparing to sync ${pending.length} eval decision(s) to Airtable.\n`);

  for (const entry of pending) {
    try {
      const recordId = await pushToAirtable(entry.record);
      if (!recordId) {
        continue;
      }

      syncState[entry.record.decisionId] = {
        recordId,
        syncedAt: new Date().toISOString(),
        sourceFile: entry.sourceFile,
      };

      await writeSyncState(syncState);
      process.stdout.write(`✔︎ Synced ${entry.record.decisionId} (${recordId})\n`);
    } catch (error) {
      console.error(`Failed to sync ${entry.record.decisionId}:`, error);
    }
  }
}

function resolveLogDir(): string {
  const configured = process.env.EVAL_LOG_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), 'eval', 'logs');
}

interface EvalRecordWithSource {
  record: EvalLogRecord;
  sourceFile: string;
}

async function loadEvalRecords(): Promise<EvalRecordWithSource[]> {
  const files = await readdir(LOG_DIR, { withFileTypes: true });
  const jsonlFiles = files.filter(file => file.isFile() && file.name.endsWith('.jsonl'));

  const records: EvalRecordWithSource[] = [];
  for (const file of jsonlFiles) {
    const filePath = path.join(LOG_DIR, file.name);
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as EvalLogRecord;
        records.push({ record: parsed, sourceFile: filePath });
      } catch (error) {
        console.warn(`Skipping malformed line in ${file.name}:`, error);
      }
    }
  }

  return records;
}

async function readSyncState(): Promise<SyncState> {
  try {
    const content = await readFile(SYNC_STATE_PATH, 'utf8');
    return JSON.parse(content) as SyncState;
  } catch {
    return {};
  }
}

async function writeSyncState(state: SyncState): Promise<void> {
  await writeFile(SYNC_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function pushToAirtable(record: EvalLogRecord): Promise<string | null> {
  if (isDryRun) {
    process.stdout.write(`[dry-run] Would push record ${record.decisionId}\n`);
    return null;
  }

  const url = new URL(`/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, 'https://api.airtable.com');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [
        {
          fields: buildFields(record),
        },
      ],
      typecast: true,
    }),
  });

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('retry-after') ?? '1');
    console.warn(`Rate limited by Airtable. Waiting ${retryAfter}s before retry…`);
    await sleep(Math.max(retryAfter, 1) * 1000);
    return pushToAirtable(record);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Airtable error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { records?: Array<{ id: string }> };
  const created = data.records?.[0]?.id;
  if (!created) {
    throw new Error('Airtable response did not include a record id.');
  }

  return created;
}

function buildFields(record: EvalLogRecord) {
  const { metadata, plan, summary } = record;
  const reasoningSnippet = metadata.reasoning.slice(0, 255);

  const baseFields: Record<string, unknown> = {
    decision_id: record.decisionId,
    created_at: record.createdAt,
    prompt_version: record.promptVersion,
    model_name: record.modelName,
    persona_detected: metadata.persona ?? 'unknown',
    step_recommended: summary.stepId,
    confidence: metadata.confidence,
    field_count: summary.fieldCount,
    reasoning_snippet: reasoningSnippet,
    status: 'unreviewed',
    session_id: record.sessionId,
  };

  const planJson = JSON.stringify(plan);
  const contextJson = JSON.stringify(record.sessionContext);

  return {
    ...baseFields,
    plan_payload: planJson.length > 50000 ? `${planJson.slice(0, 49990)}…` : planJson,
    context_snapshot: contextJson.length > 50000 ? `${contextJson.slice(0, 49990)}…` : contextJson,
    raw_response: record.rawResponse.length > 50000 ? `${record.rawResponse.slice(0, 49990)}…` : record.rawResponse,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

void main();
