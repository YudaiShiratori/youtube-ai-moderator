import browser from 'webextension-polyfill';
import { unifiedDetector } from '../lib/unified-detector';
import { storage } from '../lib/storage';
import { Comment, Settings } from '../types';

class YouTubeCommentModerator {
  private settings: Settings | null = null;
  private observer: MutationObserver | null = null;
  private isProcessing = false;

  async init() {
    // Debug: YouTube comment moderator init
    await this.loadSettings();
    // Debug: Settings loaded
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
      unifiedDetector.reset();
      this.processExistingComments();
    });

    document.addEventListener('yt-navigate-start', () => {
      unifiedDetector.reset();
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
    const selectors = [
      '#comments',
      'ytd-comments',
      'ytd-item-section-renderer#sections',
      '#contents',
      '.ytd-item-section-renderer'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Debug: Found comments container
        return element as HTMLElement;
      }
    }
    
    // Debug: No comments container found
    return null;
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
    if (!this.settings?.enabled) {
      // Settings disabled, skip processing
      return;
    }
    if (unifiedDetector.isProcessed(element)) {
      // Comment already processed
      return;
    }

    const comment = this.extractComment(element);
    if (!comment) {
      // Could not extract comment
      return;
    }

    // Processing comment
    unifiedDetector.markProcessed(element);

    // NGユーザーチェック
    if (this.settings.ngUsers.includes(comment.author)) {
      this.applyAction(element, ['nguser']);
      return;
    }

    // NGキーワードチェック
    const hasNgKeyword = this.settings.ngKeywords.some(keyword => 
      comment.text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasNgKeyword) {
      this.applyAction(element, ['ngkeyword']);
      return;
    }

    // 統一検出ロジック（アーカイブコメントとして処理）
    const result = unifiedDetector.detect(comment.text, comment.author, false);

    // Detection completed

    if (result.blocked && result.category) {
      const catSettings = this.settings?.categorySettings[result.category];
      // Check category settings
      if (catSettings?.enabled) {
        // Applying filter action
        this.applyAction(element, [result.category]);
      } else {
        // Category disabled
      }
    } else {
      // Comment passed filters
    }
  }

  private applyAction(element: HTMLElement, categories: string[]) {
    if (!this.settings) return;

    element.classList.remove('ycab-blurred', 'ycab-unblurred');
    
    const existingBadge = element.querySelector('.ycab-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // 常にぼかしを適用
    element.classList.add('ycab-blurred');

    const badge = document.createElement('span');
    badge.className = 'ycab-badge modkun-badge';
    badge.textContent = this.getCategoryLabel(categories[0]);
    element.appendChild(badge);

    // クリックでぼかし解除機能を追加
    this.addClickToUnblur(element);
  }

  private addClickToUnblur(element: HTMLElement) {
    // 既存のイベントリスナーを削除
    const existingListener = (element as HTMLElement & { _ycabClickListener?: EventListener })._ycabClickListener;
    if (existingListener) {
      element.removeEventListener('click', existingListener);
    }

    // 元の文を保存
    const comment = this.extractComment(element);
    const originalText = comment ? comment.text : '';

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
    (element as HTMLElement & { _ycabClickListener?: EventListener })._ycabClickListener = clickListener;
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

  private processExistingComments() {
    this.isProcessing = true;
    const commentElements = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-renderer');
    
    // Processing existing comments
    
    commentElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        this.processComment(element);
      }
    });
    
    this.isProcessing = false;
  }

  private reprocessAllComments() {
    document.querySelectorAll('.ycab-blurred, .ycab-unblurred').forEach((element) => {
      element.classList.remove('ycab-blurred', 'ycab-unblurred');
      const badge = element.querySelector('.ycab-badge');
      if (badge) badge.remove();
      
      // テストオーバーレイを削除
      const overlay = element.querySelector('.ycab-test-overlay');
      if (overlay) overlay.remove();
      
      // イベントリスナーを削除
      const existingListener = (element as HTMLElement & { _ycabClickListener?: EventListener })._ycabClickListener;
      if (existingListener) {
        element.removeEventListener('click', existingListener);
        delete (element as HTMLElement & { _ycabClickListener?: EventListener })._ycabClickListener;
      }
    });

    unifiedDetector.reset();
    this.processExistingComments();
  }

  destroy() {
    this.observer?.disconnect();
  }
}

// YouTube AI Moderator Content script loaded

// 基本テスト削除

const moderator = new YouTubeCommentModerator();
moderator.init();