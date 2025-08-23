// WXT 設定ファイル（MV3）。manifest は最小限のみ定義し、
// background / content / html エントリは entrypoints/ から自動生成します。
import { defineConfig } from 'wxt';

export default defineConfig({
  // ルート直下の entrypoints を利用
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  // dev でブラウザ起動時に YouTube を自動で開くと検証が楽
  webExt: {
    startUrls: ['https://www.youtube.com/watch?v=GalZ_oLq5NA&t=5293s'],
  },
  manifest: {
    name: 'YouTube AI Moderator',
    description: 'YouTubeのコメントを自動的に検出してフィルタリングします',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
    host_permissions: [
      'https://www.youtube.com/*',
      'https://www.youtube.com/live_chat*',
    ],
    // content_scripts は entrypoints/*.content.ts から自動生成
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
