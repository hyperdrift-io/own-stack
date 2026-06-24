'use client';

import { useEffect, useState } from 'react';

// Minimal beforeinstallprompt shape — not in the DOM lib types yet.
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Registers the service worker (so the app is installable + offline-capable),
// then surfaces a real "Add to home screen" action when the browser offers one.
// Once installed and launched, it reports that it is running standalone — the
// point of the whole exercise: you can't tell it from a native app.
export function InstallApp() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="island">
      <p>Install this web app — it runs standalone, indistinguishable from native.</p>
      {installed ? (
        <p className="note client">installed · running standalone</p>
      ) : deferred ? (
        <button onClick={install}>Add to home screen</button>
      ) : (
        <p className="note client">
          On a supporting browser, an install prompt appears here. On iOS Safari:
          Share → Add to Home Screen.
        </p>
      )}
    </div>
  );
}
