import browser from 'webextension-polyfill';
import { DEFAULT_SETTINGS } from '../types';

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await browser.storage.local.set({ settings: DEFAULT_SETTINGS });

    // Use standard API to open options page in MV3
    await browser.runtime.openOptionsPage();
  }
});

browser.action.onClicked.addListener(async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (tab?.url?.includes('youtube.com')) {
    await browser.tabs.sendMessage(tab.id!, { type: 'TOGGLE_ENABLED' });
  }
});

browser.runtime.onMessage.addListener((message, _sender) => {
  if (message.type === 'OPEN_OPTIONS') {
    // Use standard API to open options page in MV3
    browser.runtime.openOptionsPage();
  }
  
  return Promise.resolve();
});

export {};