// WXT のコンテンツスクリプト（YouTube 通常ページ）
import { defineContentScript } from 'wxt/utils/define-content-script';

// CSS をバンドルして manifest 経由で注入
import '../../src/content/styles.css';

export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'manifest',
  main() {
    // 既存のロジックを読み込み
    import('../../src/content/index.ts');
  },
});
