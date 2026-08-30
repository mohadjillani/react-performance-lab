import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Could not determine a free port'));
        return;
      }
      server.close(() => {
        resolve(address.port);
      });
    });
  });
}

async function waitFor(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${url} did not respond within ${String(timeoutMs)} ms`);
}

export interface RunningServer {
  port: number;
  baseUrl: string;
  stop: () => Promise<void>;
}

/** Starts `next start` for the checkout in `cwd` on a free port and waits until it answers. */
export async function startNext(cwd: string): Promise<RunningServer> {
  const port = await freePort();
  const child: ChildProcess = spawn('npx', ['next', 'start', '-p', String(port)], {
    cwd,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, PORT: String(port) },
  });
  const baseUrl = `http://127.0.0.1:${String(port)}`;
  const stop = () =>
    new Promise<void>((resolve) => {
      if (child.exitCode !== null) {
        resolve();
        return;
      }
      child.once('exit', () => {
        resolve();
      });
      child.kill('SIGTERM');
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
      }, 5000).unref();
    });
  try {
    await waitFor(`${baseUrl}/`, 60_000);
  } catch (error) {
    await stop();
    throw error;
  }
  return { port, baseUrl, stop };
}
