export type Category = 'spoiler' | 'hint' | 'hato' | 'backseat';

export type DisplayMode = 'blur';

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
  displayMode: 'blur',
  ngKeywords: [],
  ngUsers: [],
  categorySettings: {
    spoiler: { enabled: true },
    hint: { enabled: true },
    hato: { enabled: true },
    backseat: { enabled: true },
  },
};