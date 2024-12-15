// 监听扩展安装事件
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // 存储一个标志，表示需要显示欢迎引导
        chrome.storage.local.set({ 'shouldShowWelcome': true });
    }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // 只在页面完全加载时处理
    if (changeInfo.status === 'complete') {
        try {
            // 检查是否需要显示欢迎引导
            const data = await chrome.storage.local.get('shouldShowWelcome');
            if (data.shouldShowWelcome) {
                // 获取标签页信息
                const tab = await chrome.tabs.get(tabId);
                
                // 检查URL是否可以注入脚本（排除chrome://、edge://、about:等特殊页面）
                if (tab.url && !tab.url.startsWith('chrome://') && 
                    !tab.url.startsWith('edge://') && 
                    !tab.url.startsWith('about:') &&
                    !tab.url.startsWith('chrome-extension://')) {
                    
                    // 注入content script
                    await chrome.scripting.executeScript({
                        target: {tabId},
                        files: ['content.js']
                    });
                    
                    // 发送显示引导消息
                    await chrome.tabs.sendMessage(tabId, {action: 'showWelcomeGuide'});
                    
                    // 清除标志，这样欢迎引导只会显示一次
                    await chrome.storage.local.remove('shouldShowWelcome');
                }
            }
        } catch (error) {
            console.error('Error showing welcome guide:', error);
        }
    }
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-search") {
    try {
      // 获取当前标签页
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (tab) {
        // 发送消息给content script
        try {
          await chrome.tabs.sendMessage(tab.id, {action: 'toggleSearch'});
        } catch (error) {
          // 如果发送消息失败，说明content script还没注入，这时才注入
          await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            files: ['content.js']
          });
          // 重新发送消息
          await chrome.tabs.sendMessage(tab.id, {action: 'toggleSearch'});
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
});

// 检查开发者模式
async function checkDevelopmentMode() {
  const extensionInfo = await chrome.management.getSelf();
  return extensionInfo.installType === 'development';
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkDevMode') {
    checkDevelopmentMode().then(isDevelopment => {
      sendResponse({ isDevelopment });
    });
    return true; // 保持消息通道放以进行异步响应
  }
}); 