// WXT のコンテンツスクリプト（YouTube: 通常ページとアーカイブ）
import { defineContentScript } from 'wxt/utils/define-content-script';
import './content-styles.css';

// CSS を entrypoints 側で取り込み（manifest から注入）
export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  main() {
    console.error('[YCAB] YouTube content script loading...');
    import('../src/content/index.ts');
  },
});
