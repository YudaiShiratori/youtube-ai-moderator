// WXT のバックグラウンド・エントリ（自動バンドル用）
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground({
  // Chrome MV3 では module 推奨
  type: 'module',
  main() {
    // 既存の実装を読み込む（リスナー登録などは副作用で行われる）
    import('../src/background/index.ts');
  },
});
