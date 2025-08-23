export type Category = 'harassment' | 'spoiler' | 'recruiting' | 'repeat' | 'impersonation' | 'noise' | 'nioase' | 'hint' | 'strongTone';

export type DisplayMode = 'hide' | 'blur';

export interface DetectionResult {
  blocked: boolean;
  category: Category | null;
  reason: string;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  element: HTMLElement;
}

export interface Settings {
  enabled: boolean;
  displayMode: DisplayMode;
  ngKeywords: string[];
  ngUsers: string[];
  categorySettings: Record<Category, {
    enabled: boolean;
  }>;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  displayMode: 'blur',  // テスト用にblurに変更
  ngKeywords: [],
  ngUsers: [],
  categorySettings: {
    harassment: { enabled: true },
    spoiler: { enabled: true },
    recruiting: { enabled: true },
    repeat: { enabled: true },
    impersonation: { enabled: true },
    noise: { enabled: true },
    nioase: { enabled: true },
    hint: { enabled: true },
    strongTone: { enabled: true },
  },
};