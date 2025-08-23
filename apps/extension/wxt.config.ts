// WXT 設定ファイル（MV3）。manifest は最小限のみ定義し、
// background / content / html エントリは entrypoints/ から自動生成します。
import { defineConfig } from 'wxt';

export default defineConfig({
  // ルート直下の entrypoints を利用
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  manifest: {
    name: 'YouTube AI Moderator',
    description: 'YouTubeのコメントを自動的に検出してフィルタリングします',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
    host_permissions: [
      'https://www.youtube.com/*',
      'https://www.youtube.com/live_chat*',
    ],
    content_scripts: [
      {
        matches: ['https://www.youtube.com/*'],
        js: ['src/content/index.ts'],
        css: ['src/content/styles.css'],
        run_at: 'document_idle',
      },
      {
        matches: ['https://www.youtube.com/live_chat*'],
        js: ['src/content/livechat.ts'],
        css: ['src/content/styles.css'],
        run_at: 'document_idle',
        all_frames: true,
      },
    ],
    action: {
      default_popup: 'entrypoints/popup.html',
      default_icon: {
        '16': 'icons/icon16.png',
        '48': 'icons/icon48.png',
        '128': 'icons/icon128.png',
      },
    },
    options_ui: {
      page: 'entrypoints/options.html',
      open_in_tab: true,
    },
    icons: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
    web_accessible_resources: [
      {
        resources: ['src/content/styles.css'],
        matches: ['https://www.youtube.com/*'],
      },
    ],
  },
});
