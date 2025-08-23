// WXT のコンテンツスクリプト（YouTube ライブチャット）
import { defineContentScript } from 'wxt/utils/define-content-script';

import '../../src/content/styles.css';

export default defineContentScript({
  matches: ['https://www.youtube.com/live_chat*'],
  runAt: 'document_idle',
  allFrames: true,
  cssInjectionMode: 'manifest',
  main() {
    import('../../src/content/livechat.ts');
  },
});
