import browser from 'webextension-polyfill';
import { DEFAULT_SETTINGS } from '../types';

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await browser.storage.local.set({ settings: DEFAULT_SETTINGS });
    
    const url = browser.runtime.getURL('src/options/index.html');
    await browser.tabs.create({ url });
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
    const url = browser.runtime.getURL('src/options/index.html');
    browser.tabs.create({ url });
  }
  
  return Promise.resolve();
});

export {};