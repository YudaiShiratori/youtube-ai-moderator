import browser from 'webextension-polyfill';
import { Settings, DEFAULT_SETTINGS } from '../types';

export const storage = {
  async getSettings(): Promise<Settings> {
    const result = await browser.storage.local.get('settings');
    return { ...DEFAULT_SETTINGS, ...(result.settings || {}) };
  },

  async saveSettings(settings: Partial<Settings>): Promise<void> {
    const current = await this.getSettings();
    await browser.storage.local.set({
      settings: { ...current, ...settings },
    });
  },

  async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    return JSON.stringify(settings, null, 2);
  },

  async importSettings(json: string): Promise<void> {
    try {
      const settings = JSON.parse(json);
      await this.saveSettings(settings);
    } catch (error) {
      throw new Error('無効な設定ファイルです');
    }
  },
};