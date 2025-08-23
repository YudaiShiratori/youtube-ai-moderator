import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { storage } from '../lib/storage';
import { Settings, Category, DisplayMode } from '../types';

function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [ngKeywordInput, setNgKeywordInput] = useState('');
  const [ngUserInput, setNgUserInput] = useState('');

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

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      await storage.saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('設定の保存に失敗しました', error);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateCategorySetting = (category: Category, enabled: boolean) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      categorySettings: {
        ...settings.categorySettings,
        [category]: {
          enabled,
        },
      },
    });
  };

  const addNgKeyword = () => {
    if (!settings || !ngKeywordInput.trim()) return;
    
    const keywords = [...settings.ngKeywords, ngKeywordInput.trim()];
    updateSetting('ngKeywords', keywords);
    setNgKeywordInput('');
  };

  const removeNgKeyword = (keyword: string) => {
    if (!settings) return;
    
    const keywords = settings.ngKeywords.filter(k => k !== keyword);
    updateSetting('ngKeywords', keywords);
  };

  const addNgUser = () => {
    if (!settings || !ngUserInput.trim()) return;
    
    const users = [...settings.ngUsers, ngUserInput.trim()];
    updateSetting('ngUsers', users);
    setNgUserInput('');
  };

  const removeNgUser = (user: string) => {
    if (!settings) return;
    
    const users = settings.ngUsers.filter(u => u !== user);
    updateSetting('ngUsers', users);
  };

  const exportSettings = async () => {
    const json = await storage.exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube-ai-moderator-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      await storage.importSettings(text);
      await loadSettings();
      alert('設定をインポートしました');
    } catch (error) {
      alert('設定のインポートに失敗しました');
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  if (!settings) {
    return <div className="error">設定の読み込みに失敗しました</div>;
  }

  const categories: Array<{ key: Category; label: string; description: string }> = [
    { key: 'harassment', label: '直接攻撃', description: '侮辱語 + 対象指示/命令' },
    { key: 'spoiler', label: '露骨ネタバレ', description: '核心的なネタバレ + 具体性' },
    { key: 'recruiting', label: '勧誘・連絡誘導', description: 'CTA + 連絡先/短縮URL' },
    { key: 'repeat', label: '連投スパム', description: '同一内容の繰り返し' },
    { key: 'impersonation', label: 'なりすまし', description: '公式を騙る + 連絡誘導' },
    { key: 'noise', label: '絵文字壁・ノイズ', description: '絵文字や記号の極端な壁' },
    { key: 'nioase', label: '匂わせ', description: '情報リーク + 時系列' },
    { key: 'hint', label: 'ライブ匂わせ', description: 'ライブチャット専用：直接示唆・伏せ字' },
    { key: 'strongTone', label: 'ライブ語気強', description: 'ライブチャット専用：強い命令・記号壁' },
  ];

  return (
    <div className="container">
      <header className="header">
        <h1>YouTube AI Moderator 設定</h1>
        {saved && <div className="saved-message">設定を保存しました</div>}
      </header>

      <main className="main">
        <section className="section">
          <h2>基本設定</h2>
          
          <div className="setting-group">
            <label className="setting-label">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
              />
              フィルターを有効にする
            </label>
          </div>

          <div className="setting-group">
            <label className="setting-label">表示モード</label>
            <select
              value={settings.displayMode}
              onChange={(e) => updateSetting('displayMode', e.target.value as DisplayMode)}
              className="select"
            >
              <option value="hide">非表示</option>
              <option value="blur">ぼかし</option>
            </select>
          </div>

          <div className="setting-group">
            <label className="setting-label">検出モード</label>
            <div className="mode-info">
              <strong>厳格モード</strong> - 1ヒット即ブロック（しきい値なし）
            </div>
          </div>
        </section>

        <section className="section">
          <h2>カテゴリ別設定</h2>
          
          {categories.map(({ key, label, description }) => (
            <div key={key} className="category-setting">
              <div className="category-header">
                <label className="category-label">
                  <input
                    type="checkbox"
                    checked={settings.categorySettings[key].enabled}
                    onChange={(e) => updateCategorySetting(key, e.target.checked)}
                  />
                  {label}
                </label>
              </div>
              <div className="category-description">
                {description}
              </div>
            </div>
          ))}
        </section>

        <section className="section">
          <h2>NGキーワード</h2>
          
          <div className="ng-input-group">
            <input
              type="text"
              value={ngKeywordInput}
              onChange={(e) => setNgKeywordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNgKeyword()}
              placeholder="NGキーワードを入力"
              className="input"
            />
            <button onClick={addNgKeyword} className="add-button">追加</button>
          </div>
          
          <div className="ng-list">
            {settings.ngKeywords.map((keyword) => (
              <div key={keyword} className="ng-item">
                <span>{keyword}</span>
                <button onClick={() => removeNgKeyword(keyword)} className="remove-button">×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>NGユーザー</h2>
          
          <div className="ng-input-group">
            <input
              type="text"
              value={ngUserInput}
              onChange={(e) => setNgUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNgUser()}
              placeholder="NGユーザー名を入力"
              className="input"
            />
            <button onClick={addNgUser} className="add-button">追加</button>
          </div>
          
          <div className="ng-list">
            {settings.ngUsers.map((user) => (
              <div key={user} className="ng-item">
                <span>{user}</span>
                <button onClick={() => removeNgUser(user)} className="remove-button">×</button>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>インポート/エクスポート</h2>
          
          <div className="import-export">
            <button onClick={exportSettings} className="button">設定をエクスポート</button>
            <label className="button">
              設定をインポート
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </section>

        <div className="save-section">
          <button onClick={saveSettings} className="save-button">設定を保存</button>
        </div>
      </main>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}