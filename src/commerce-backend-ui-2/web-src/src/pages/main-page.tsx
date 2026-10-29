import { useEffect, useState, type FormEvent } from 'react';
import { useIms } from '@adobe/aio-commerce-lib-admin-ui/web';
import actionUrls from '../config.json';

type Settings = { enabled: boolean; maxQuantity: string; enableCompensatingCorrection: boolean };
const initial: Settings = { enabled: true, maxQuantity: '10', enableCompensatingCorrection: true };
const getUrl = actionUrls['cart-validation-settings/get-cart-validation-settings'];
const saveUrl = actionUrls['cart-validation-settings/save-cart-validation-settings'];

export function MainPage() {
  const { data, error: imsError } = useIms();
  const [settings, setSettings] = useState<Settings>(initial);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const token = data?.imsToken;
  const orgId = data?.imsOrgId;

  useEffect(() => {
    if (!token || !orgId) return;
    const abort = new AbortController();
    async function load() {
      try {
        const response = await fetch(getUrl, { headers: { authorization: `Bearer ${token}`, 'x-gw-ims-org-id': orgId! }, signal: abort.signal });
        if (!response.ok) throw new Error('load_failed');
        const values: Settings = await response.json();
        if (!abort.signal.aborted) setSettings(values);
      } catch {
        if (!abort.signal.aborted) setNotice('Unable to load settings. Retry by reloading this page.');
      } finally {
        if (!abort.signal.aborted) setBusy(false);
      }
    }
    void load();
    return () => abort.abort();
  }, [token, orgId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !orgId || !/^[1-9]\d*$/.test(settings.maxQuantity) || !Number.isSafeInteger(Number(settings.maxQuantity))) {
      setNotice('Max Quantity must be a positive whole number.');
      return;
    }
    setBusy(true); setNotice('');
    try {
      const response = await fetch(saveUrl, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-gw-ims-org-id': orgId, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('save_failed');
      const saved: Settings = await response.json();
      setSettings(saved); setNotice('Settings saved.');
    } catch {
      setNotice('Settings could not be saved. No changes were confirmed.');
    } finally { setBusy(false); }
  }

  if (imsError) return <main role="alert">Authentication is unavailable. Reopen the page in Commerce Admin.</main>;
  return <main style={{ maxWidth: 540, padding: 24 }}>
    <h1>Cart Item Validation Settings</h1>
    <p>These settings are also editable in App Management. Changes affect all stores.</p>
    {notice && <p role="status">{notice}</p>}
    <form onSubmit={(event) => { void save(event); }}>
      <p><label><input type="checkbox" checked={settings.enabled} disabled={busy} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} /> Enabled</label></p>
      <p><label>Max Quantity<br /><input type="number" min="1" step="1" required value={settings.maxQuantity} disabled={busy} onChange={(event) => setSettings({ ...settings, maxQuantity: event.target.value })} /></label></p>
      <p><label><input type="checkbox" checked={settings.enableCompensatingCorrection} disabled={busy} onChange={(event) => setSettings({ ...settings, enableCompensatingCorrection: event.target.checked })} /> Enable Compensating Correction</label></p>
      <button type="submit" disabled={busy || !token || !orgId}>{busy ? 'Loading…' : 'Save settings'}</button>
    </form>
  </main>;
}
