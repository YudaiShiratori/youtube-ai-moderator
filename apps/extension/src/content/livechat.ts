import browser from 'webextension-polyfill';
import { liveChatDetector } from '../lib/livechat-detector';
import { storage } from '../lib/storage';
import { Settings } from '../types';

/**
 * YouTubeライブチャット専用コンテンツスクリプト
 * yt-live-chat-item-list-renderer 内のメッセージを監視・フィルタリング
 */

class YouTubeLiveChatModerator {
  private settings: Settings | null = null;
  private observer: MutationObserver | null = null;
  private isProcessing = false;
  private chatContainer: Element | null = null;

  async init() {
    // ライブチャットページでのみ動作
    if (!window.location.href.includes('live_chat')) {
      return;
    }

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
      liveChatDetector.reset();
    });
  }

  private waitForChatContainer() {
    // ライブチャットコンテナの出現を待つ
    const checkContainer = () => {
      this.chatContainer = document.querySelector('yt-live-chat-item-list-renderer #items');
      
      if (this.chatContainer) {
        this.setupObserver();
        this.processExistingMessages();
      } else {
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
    return element.tagName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER' ||
           element.querySelector('yt-live-chat-text-message-renderer') !== null;
  }

  private extractMessage(element: HTMLElement): { author: string; text: string } | null {
    // ライブチャットのメッセージ構造から情報を抽出
    let messageElement = element;
    if (element.tagName !== 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER') {
      messageElement = element.querySelector('yt-live-chat-text-message-renderer') || element;
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
    if (liveChatDetector.isProcessed(element)) return;

    const message = this.extractMessage(element);
    if (!message) return;

    liveChatDetector.markProcessed(element);

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

    // ライブチャット専用検出
    const result = liveChatDetector.detect(message.text, message.author);

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
    element.classList.remove('ycab-hidden', 'ycab-blurred');
    
    const existingBadge = element.querySelector('.ycab-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // 表示モードに応じて処理
    if (this.settings.displayMode === 'hide') {
      element.classList.add('ycab-hidden');
    } else {
      element.classList.add('ycab-blurred');
    }

    // バッジを追加
    const badge = document.createElement('span');
    badge.className = 'ycab-badge modkun-badge';
    badge.textContent = this.getCategoryLabel(category);
    
    // ライブチャットメッセージの適切な位置にバッジを配置
    const messageContainer = element.querySelector('#content') || element;
    messageContainer.appendChild(badge);
  }

  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      harassment: '攻撃',
      spoiler: 'ネタバレ',
      recruiting: '勧誘',
      repeat: '連投',
      impersonation: 'なりすまし',
      noise: 'ノイズ',
      nioase: '匂わせ',
      hint: 'ライブ匂わせ',
      strongTone: 'ライブ語気強',
      nguser: 'NGユーザー',
      ngkeyword: 'NGワード',
    };
    return labels[category] || 'フィルター';
  }

  private processExistingMessages() {
    if (!this.chatContainer) return;
    
    this.isProcessing = true;
    const messages = this.chatContainer.querySelectorAll('yt-live-chat-text-message-renderer');
    
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
    this.chatContainer.querySelectorAll('.ycab-hidden, .ycab-blurred').forEach((element) => {
      element.classList.remove('ycab-hidden', 'ycab-blurred');
      const badge = element.querySelector('.ycab-badge');
      if (badge) badge.remove();
    });

    liveChatDetector.reset();
    this.processExistingMessages();
  }

  destroy() {
    this.observer?.disconnect();
  }
}

// ライブチャットページでのみ初期化
const liveChatModerator = new YouTubeLiveChatModerator();
liveChatModerator.init();