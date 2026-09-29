#!/usr/bin/env node
// The passkey ceremony in a real Chrome, with Chrome's own virtual authenticator
// standing in for a fingerprint: create a passkey, read /account, sign out, sign
// in again. Speaks the DevTools protocol over a WebSocket; no test framework.
//
//   ORIGIN=http://localhost:3024 npm run dev -- --port 3024     (one terminal)
//   node scripts/passkey-e2e.mjs http://localhost:3024          (another)

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const profile = mkdtempSync(join(tmpdir(), 'passkey-e2e-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

const steps = [];
const step = (name, ok, detail = '') => {
  steps.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) throw new Error(name);
};

async function devtoolsUrl() {
  for (let i = 0; i < 100; i++) {
    try {
      const [port, path] = readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').trim().split('\n');
      return `ws://127.0.0.1:${port}${path}`;
    } catch {
      await sleep(100);
    }
  }
  throw new Error('Chrome did not start');
}

function connect(url) {
  const socket = new WebSocket(url);
  const waiting = new Map();
  let next = 0;
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const pending = waiting.get(message.id);
    if (!pending) return;
    waiting.delete(message.id);
    if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
    else pending.resolve(message.result);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next;
      waiting.set(id, { resolve, reject, method });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve({ send, close: () => socket.close() }));
    socket.addEventListener('error', () => reject(new Error('DevTools socket failed')));
  });
}

try {
  const browser = await connect(await devtoolsUrl());
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => browser.send(method, params, sessionId);

  await page('Page.enable');
  await page('Runtime.enable');
  await page('WebAuthn.enable');
  const { authenticatorId } = await page('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
      hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
    },
  });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const until = async (expression, seconds = 15) => {
    for (let i = 0; i < seconds * 10; i++) {
      if (await evaluate(expression).catch(() => false)) return true;
      await sleep(100);
    }
    return false;
  };
  const open = async (path) => {
    await page('Page.navigate', { url: `${base}${path}` });
    await until(`document.readyState === 'complete' && location.pathname === ${JSON.stringify(path)}`);
  };
  const press = (label) => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(label)} && !b.disabled);
    if (!button) return false;
    button.click();
    return true;
  })()`);
  const heading = (text) => until(`document.querySelector('h1')?.textContent.includes(${JSON.stringify(text)})`);
  const statusLine = () => evaluate(`document.querySelector('[role=status]')?.textContent ?? ''`);

  await open('/dashboard');
  step('the page offers a passkey once the browser supports the JSON helpers',
    await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Create a passkey' && !b.disabled)`));

  await press('Create a passkey');
  step('creating a passkey signs the visitor in', await heading('You’re in.') || await heading("You're in."), await statusLine());

  const { credentials } = await page('WebAuthn.getCredentials', { authenticatorId });
  step('the authenticator holds one discoverable credential', credentials.length === 1 && credentials[0].isResidentCredential === true);

  await open('/account');
  step('/account lists the passkey', await until(`document.body.textContent.includes('Passkey 1:')`));

  await open('/dashboard');
  await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Sign out')`);
  await press('Sign out');
  step('sign-out ends the session', await heading('Sign in without a password.'));

  await open('/account');
  step('/account sends a signed-out visitor back to /dashboard', await until(`location.pathname === '/dashboard'`));

  await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'I already have one' && !b.disabled)`);
  await press('I already have one');
  step('the existing passkey signs the visitor in again', await heading('You’re in.') || await heading("You're in."), await statusLine());

  const after = await page('WebAuthn.getCredentials', { authenticatorId });
  step('the key counted its second signature', after.credentials[0].signCount >= 2, `signCount ${after.credentials[0].signCount}`);

  await page('WebAuthn.clearCredentials', { authenticatorId });
  await open('/dashboard');
  await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Sign out')`);
  await press('Sign out');
  await heading('Sign in without a password.');
  await until(`[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'I already have one' && !b.disabled)`);
  await press('I already have one');
  step('a browser with no passkey is told so, and stays signed out',
    await until(`(document.querySelector('[role=status]')?.textContent ?? '').length > 0`) &&
      !(await evaluate(`document.querySelector('h1')?.textContent.includes('in.')`)), await statusLine());

  browser.close();
  console.log(`\n${steps.length} steps, all ok`);
} catch (error) {
  console.error(`\nstopped: ${error.message}`);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
