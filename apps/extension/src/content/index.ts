import browser from 'webextension-polyfill';
import { detector } from '../lib/detector';
import { storage } from '../lib/storage';
import { Comment, Settings } from '../types';

class YouTubeCommentModerator {
  private settings: Settings | null = null;
  private observer: MutationObserver | null = null;
  private isProcessing = false;

  async init() {
    console.log('[YouTube AI Moderator] Initializing...');
    // TEST: 全コメント強制ぼかし用のグローバルスタイルを注入（後で削除）
    const styleId = 'ycab-test-global-style';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        ytd-comment-thread-renderer, ytd-comment-renderer { position: relative !important; }
        ytd-comment-thread-renderer #content,
        ytd-comment-renderer #content,
        #content-text { filter: blur(8px) brightness(0.5) !important; }
      `;
      document.head.appendChild(s);
    }
    await this.loadSettings();
    console.log('[YouTube AI Moderator] Settings loaded:', this.settings);
    this.setupObserver();
    this.setupListeners();
    this.processExistingComments();
  }

  private async loadSettings() {
    this.settings = await storage.getSettings();
  }

  private setupListeners() {
    browser.storage.onChanged.addListener(async (changes) => {
      if (changes.settings) {
        await this.loadSettings();
        this.reprocessAllComments();
      }
    });

    document.addEventListener('yt-navigate-finish', () => {
      detector.reset();
      this.processExistingComments();
    });

    document.addEventListener('yt-navigate-start', () => {
      detector.reset();
    });
  }

  private setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (this.isProcessing) return;
      
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            this.processCommentNode(node);
          }
        }
      }
    });

    const commentsContainer = this.findCommentsContainer();
    if (commentsContainer) {
      this.observer.observe(commentsContainer, {
        childList: true,
        subtree: true,
      });
    } else {
      setTimeout(() => this.setupObserver(), 1000);
    }
  }

  private findCommentsContainer(): HTMLElement | null {
    return document.querySelector('#comments, ytd-comments, ytd-item-section-renderer#sections');
  }

  private extractComment(element: HTMLElement): Comment | null {
    const authorElement = element.querySelector('#author-text, .ytd-comment-renderer #author-text');
    const textElement = element.querySelector('#content-text, .ytd-comment-renderer #content-text');
    
    if (!authorElement || !textElement) return null;

    const author = authorElement.textContent?.trim() || '';
    const text = textElement.textContent?.trim() || '';
    const id = element.id || `comment-${Date.now()}-${Math.random()}`;

    if (!author || !text) return null;

    return { id, author, text, element };
  }

  private processCommentNode(node: HTMLElement) {
    const commentElements = node.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer');
    
    commentElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        this.processComment(element);
      }
    });

    if (node.matches('ytd-comment-thread-renderer, ytd-comment-renderer')) {
      this.processComment(node);
    }
  }

  private async processComment(element: HTMLElement) {
    // TEST: 全コメントを強制的にぼかす（後で戻す）
    try {
      const commentRoot = element.closest('ytd-comment-thread-renderer, ytd-comment-renderer') as HTMLElement | null;
      const target = commentRoot ?? element;
      target.classList.remove('ycab-hidden', 'ycab-blurred');
      target.classList.add('ycab-blurred');
      const textEl = target.querySelector('#content, #content-text, .ytd-comment-renderer #content-text') as HTMLElement | null;
      if (textEl) textEl.classList.add('ycab-blurred');
    } catch (e) {
      console.warn('blur failed', e);
    }
    return;

    if (!this.settings?.enabled) return;
    if (detector.isProcessed(element)) return;

    const comment = this.extractComment(element);
    if (!comment) return;

    console.log('[YouTube AI Moderator] Processing comment:', comment.text, 'by', comment.author);
    detector.markProcessed(element);

    if (this.settings.ngUsers.includes(comment.author)) {
      this.applyAction(element, ['nguser']);
      return;
    }

    const hasNgKeyword = this.settings.ngKeywords.some(keyword => 
      comment.text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasNgKeyword) {
      this.applyAction(element, ['ngkeyword']);
      return;
    }

    const result = detector.detect(
      comment.text,
      comment.author
    );
    console.log('[YouTube AI Moderator] Detection result:', result);

    if (result.blocked && result.category) {
      const catSettings = this.settings?.categorySettings[result.category];
      console.log('[YouTube AI Moderator] Category settings:', catSettings);
      if (catSettings?.enabled) {
        console.log('[YouTube AI Moderator] Blocking comment:', result.category);
        this.applyAction(element, [result.category]);
      }
    }
  }

  private applyAction(element: HTMLElement, categories: string[]) {
    if (!this.settings) return;

    element.classList.remove('ycab-hidden', 'ycab-blurred');
    
    const existingBadge = element.querySelector('.ycab-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    if (this.settings.displayMode === 'hide') {
      element.classList.add('ycab-hidden');
    } else {
      element.classList.add('ycab-blurred');
    }

    const badge = document.createElement('span');
    badge.className = 'ycab-badge';
    badge.textContent = this.getCategoryLabel(categories[0]);
    element.appendChild(badge);
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

  private processExistingComments() {
    this.isProcessing = true;
    const commentElements = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer');
    
    commentElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        this.processComment(element);
      }
    });
    
    this.isProcessing = false;
  }

  private reprocessAllComments() {
    document.querySelectorAll('.ycab-hidden, .ycab-blurred').forEach((element) => {
      element.classList.remove('ycab-hidden', 'ycab-blurred');
      const badge = element.querySelector('.ycab-badge');
      if (badge) badge.remove();
    });

    detector.reset();
    this.processExistingComments();
  }

  destroy() {
    this.observer?.disconnect();
  }
}

console.log('[YouTube AI Moderator] Content script loaded!');
const moderator = new YouTubeCommentModerator();
moderator.init();