import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface PlanEditTelemetryPayload {
  recipeId: string;
  controlId: string;
  previousValue: unknown;
  nextValue: unknown;
  signalsSummary: string;
  timestamp?: string;
}

interface PlanEditRecord extends PlanEditTelemetryPayload {
  timestamp: string;
}

const LOG_DIRECTORY = path.join(process.cwd(), "data");
const LOG_FILE_PATH = path.join(LOG_DIRECTORY, "plan-edits.jsonl");

let fileLoggingDisabled = false;
let hasWarnedAboutFile = false;

async function ensureLogDirectory(): Promise<void> {
  await mkdir(LOG_DIRECTORY, { recursive: true });
}

export async function recordPlanEdit(payload: PlanEditTelemetryPayload): Promise<void> {
  const record: PlanEditRecord = {
    ...payload,
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  // eslint-disable-next-line no-console -- Railway console output serves as the minimal telemetry sink.
  console.info("plan-edit", record);

  if (fileLoggingDisabled) {
    return;
  }

  try {
    await ensureLogDirectory();
    await appendFile(LOG_FILE_PATH, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    fileLoggingDisabled = true;

    if (!hasWarnedAboutFile) {
      console.warn(
        "Plan edit telemetry will use console output only due to file write failure.",
        error
      );
      hasWarnedAboutFile = true;
    }
  }
}
