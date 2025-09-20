#!/usr/bin/env bun

const endpoint = process.argv[2]?.trim() || process.env.LABELING_ENDPOINT || "http://localhost:3000/api/labeling";

async function main() {
  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const message = await response.text();
      console.error(`Request failed (${response.status}): ${message || response.statusText}`);
      process.exitCode = 1;
      return;
    }

    const payload = (await response.json()) as Record<string, unknown>;
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } catch (error) {
    console.error(`Unable to reach labeling endpoint at ${endpoint}`);
    console.error(error);
    process.exitCode = 1;
  }
}

void main();
