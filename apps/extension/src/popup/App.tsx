import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { storage } from '../lib/storage';
import { Settings } from '../types';

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await storage.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('設定の読み込みに失敗しました', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async () => {
    if (!settings) return;
    
    const newSettings = { ...settings, enabled: !settings.enabled };
    await storage.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const openOptions = () => {
    browser.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    window.close();
  };

  if (loading) {
    return (
      <div className="popup">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="popup">
      <header className="header">
        <h1>YouTube AI Moderator</h1>
      </header>
      
      <main className="main">
        <div className="status">
          <span className="status-label">フィルター状態:</span>
          <span className={`status-value ${settings?.enabled ? 'enabled' : 'disabled'}`}>
            {settings?.enabled ? '有効' : '無効'}
          </span>
        </div>

        <div className="toggle-section">
          <button
            className={`toggle-button ${settings?.enabled ? 'active' : ''}`}
            onClick={toggleEnabled}
          >
            {settings?.enabled ? 'フィルターを無効にする' : 'フィルターを有効にする'}
          </button>
        </div>

        <div className="info">
          <div className="info-row">
            <span className="info-label">表示モード:</span>
            <span className="info-value">
              {'ぼかし'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">検出モード:</span>
            <span className="info-value">厳格モード（1ヒット即ブロック）</span>
          </div>
        </div>

        <button className="settings-button" onClick={openOptions}>
          詳細設定を開く
        </button>
      </main>

      <footer className="footer">
        <div className="version">v1.0.0</div>
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}