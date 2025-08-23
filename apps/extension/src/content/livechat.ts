import browser from 'webextension-polyfill';
import { unifiedDetector } from '../lib/unified-detector';
import { storage } from '../lib/storage';
import { Settings } from '../types';

/**
 * YouTubeライブチャットコンテンツスクリプト
 * ライブチャット・アーカイブのメッセージを監視・フィルタリング
 */

class YouTubeLiveChatModerator {
  private settings: Settings | null = null;
  private observer: MutationObserver | null = null;
  private isProcessing = false;
  private chatContainer: Element | null = null;

  async init() {
    console.log('[YCAB] LiveChat init called, URL:', window.location.href);
    
    // ライブチャットまたはアーカイブのライブチャットページでのみ動作
    if (!window.location.href.includes('live_chat') && !window.location.href.includes('live_chat_replay')) {
      console.log('[YCAB] Not a live chat page, skipping');
      return;
    }

    console.log('[YCAB] Live chat page detected');
    await this.loadSettings();
    this.setupListeners();
    this.waitForChatContainer();
  }

  private async loadSettings() {
    this.settings = await storage.getSettings();
  }

  private setupListeners() {
    // 設定変更の監視
    browser.storage.onChanged.addListener(async (changes) => {
      if (changes.settings) {
        await this.loadSettings();
        this.reprocessAllMessages();
      }
    });

    // ライブチャット特有のナビゲーション処理
    document.addEventListener('yt-live-chat-item-list-renderer-updated', () => {
      unifiedDetector.reset();
    });
  }

  private waitForChatContainer() {
    console.log('[YCAB] Waiting for chat container...');
    // ライブチャットコンテナの出現を待つ（ライブとアーカイブ両対応）
    const checkContainer = () => {
      // ライブチャットとアーカイブのチャットで同じセレクタを使用
      this.chatContainer = document.querySelector('yt-live-chat-item-list-renderer #items') ||
                          document.querySelector('yt-live-chat-replay-renderer #items');
      
      if (this.chatContainer) {
        console.log('[YCAB] Chat container found:', this.chatContainer);
        this.setupObserver();
        this.processExistingMessages();
      } else {
        console.log('[YCAB] Chat container not found, retrying...');
        // 100ms後に再チェック
        setTimeout(checkContainer, 100);
      }
    };

    checkContainer();
  }

  private setupObserver() {
    if (!this.chatContainer) return;
    
    this.observer = new MutationObserver((mutations) => {
      if (this.isProcessing || !this.settings?.enabled) return;
      
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && this.isLiveChatMessage(node)) {
            this.processMessage(node);
          }
        }
      }
    });

    this.observer.observe(this.chatContainer, {
      childList: true,
      subtree: true,
    });
  }

  private isLiveChatMessage(element: HTMLElement): boolean {
    // ライブチャットとリプレイの両方のメッセージタイプをチェック
    return element.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER' ||
           element.tagName === 'YT-LIVE-CHAT-REPLAY-TEXT-MESSAGE-RENDERER' ||
           element.querySelector('yt-live-chat-text-message-renderer') !== null ||
           element.querySelector('yt-live-chat-replay-text-message-renderer') !== null;
  }

  private extractMessage(element: HTMLElement): { author: string; text: string } | null {
    // ライブチャットとリプレイのメッセージ構造から情報を抽出
    let messageElement = element;
    if (element.tagName !== 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER' && 
        element.tagName !== 'YT-LIVE-CHAT-REPLAY-TEXT-MESSAGE-RENDERER') {
      messageElement = element.querySelector('yt-live-chat-text-message-renderer') || 
                       element.querySelector('yt-live-chat-replay-text-message-renderer') || 
                       element;
    }

    // 著者名の取得
    const authorElement = messageElement.querySelector('#author-name');
    const author = authorElement?.textContent?.trim() || '';

    // メッセージ本文の取得
    const messageContentElement = messageElement.querySelector('#message');
    const text = messageContentElement?.textContent?.trim() || '';

    if (!author || !text) return null;

    return { author, text };
  }

  private async processMessage(element: HTMLElement) {
    if (!this.settings?.enabled) return;
    if (unifiedDetector.isProcessed(element)) return;

    const message = this.extractMessage(element);
    if (!message) return;

    unifiedDetector.markProcessed(element);

    // NGユーザーチェック
    if (this.settings.ngUsers.includes(message.author)) {
      this.applyAction(element, 'nguser');
      return;
    }

    // NGキーワードチェック
    const hasNgKeyword = this.settings.ngKeywords.some(keyword => 
      message.text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasNgKeyword) {
      this.applyAction(element, 'ngkeyword');
      return;
    }

    // 統一検出ロジック（ライブチャットとして処理）
    const result = unifiedDetector.detect(message.text, message.author, true);

    if (result.blocked && result.category) {
      const catSettings = this.settings?.categorySettings[result.category];
      if (catSettings?.enabled) {
        this.applyAction(element, result.category);
      }
    }
  }

  private applyAction(element: HTMLElement, category: string) {
    if (!this.settings) return;

    // 既存のクラスとバッジを削除
    element.classList.remove('ycab-blurred', 'ycab-unblurred');
    
    const existingBadge = element.querySelector('.ycab-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // 常にぼかしを適用
    element.classList.add('ycab-blurred');

    // バッジを追加
    const badge = document.createElement('span');
    badge.className = 'ycab-badge modkun-badge';
    badge.textContent = this.getCategoryLabel(category);
    
    // ライブチャットメッセージの適切な位置にバッジを配置
    const messageContainer = element.querySelector('#content') || element;
    messageContainer.appendChild(badge);

    // クリックでぼかし解除機能を追加
    this.addClickToUnblur(element);
  }

  private addClickToUnblur(element: HTMLElement) {
    // 既存のイベントリスナーを削除
    const existingListener = (element as any)._ycabClickListener;
    if (existingListener) {
      element.removeEventListener('click', existingListener);
    }

    // 元の文を保存
    const message = this.extractMessage(element);
    const originalText = message ? `${message.author}: ${message.text}` : '';

    const clickListener = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      
      const existingOverlay = element.querySelector('.ycab-test-overlay');
      
      if (element.classList.contains('ycab-blurred')) {
        // テスト用オーバーレイを表示
        if (!existingOverlay) {
          const overlay = document.createElement('div');
          overlay.className = 'ycab-test-overlay';
          overlay.textContent = originalText || 'テキストが取得できませんでした';
          element.appendChild(overlay);
        }
        element.classList.remove('ycab-blurred');
        element.classList.add('ycab-unblurred');
      } else {
        // オーバーレイを削除
        if (existingOverlay) {
          existingOverlay.remove();
        }
        element.classList.remove('ycab-unblurred');
        element.classList.add('ycab-blurred');
      }
    };

    element.addEventListener('click', clickListener);
    (element as any)._ycabClickListener = clickListener;
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      spoiler: 'ネタバレ',
      hint: '匂わせ',
      hato: '鳩行為',
      backseat: '指示厨',
      nguser: 'NGユーザー',
      ngkeyword: 'NGワード',
    };
    return labels[category] || 'フィルター';
  }

  private processExistingMessages() {
    if (!this.chatContainer) return;
    
    this.isProcessing = true;
    // ライブチャットとリプレイの両方のメッセージを取得
    const messages = this.chatContainer.querySelectorAll(
      'yt-live-chat-text-message-renderer, yt-live-chat-replay-text-message-renderer'
    );
    
    messages.forEach((element) => {
      if (element instanceof HTMLElement) {
        this.processMessage(element);
      }
    });
    
    this.isProcessing = false;
  }

  private reprocessAllMessages() {
    if (!this.chatContainer) return;

    // 既存のフィルタリングをリセット
    this.chatContainer.querySelectorAll('.ycab-blurred, .ycab-unblurred').forEach((element) => {
      element.classList.remove('ycab-blurred', 'ycab-unblurred');
      const badge = element.querySelector('.ycab-badge');
      if (badge) badge.remove();
      
      // テストオーバーレイを削除
      const overlay = element.querySelector('.ycab-test-overlay');
      if (overlay) overlay.remove();
      
      // イベントリスナーを削除
      const existingListener = (element as any)._ycabClickListener;
      if (existingListener) {
        element.removeEventListener('click', existingListener);
        delete (element as any)._ycabClickListener;
      }
    });

    unifiedDetector.reset();
    this.processExistingMessages();
  }

  destroy() {
    this.observer?.disconnect();
  }
}

// ライブチャットページでのみ初期化
console.log('[YCAB] LiveChat script loaded!', window.location.href);
const liveChatModerator = new YouTubeLiveChatModerator();
liveChatModerator.init();