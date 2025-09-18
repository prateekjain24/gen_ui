#!/usr/bin/env node
import { spawn } from 'node:child_process';
import console from 'node:console';
import process from 'node:process';

const child = spawn('bun', ['run', 'dev'], {
  env: {
    ...process.env,
    NEXT_PUBLIC_DEBUG: 'true',
  },
  stdio: 'inherit',
  shell: false,
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

child.on('error', error => {
  console.error('Failed to launch dev server with debug flag.', error);
  process.exit(1);
});
