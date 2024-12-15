document.addEventListener('DOMContentLoaded', async function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const findNextButton = document.getElementById('findNext');
    const findPrevButton = document.getElementById('findPrev');
    const countMatchesButton = document.getElementById('countMatches');
    const clearResultsButton = document.getElementById('clearResults');
    const closeButton = document.getElementById('close');
    const matchCount = document.getElementById('matchCount');
    const currentMatch = document.getElementById('currentMatch');

    let currentMatchIndex = -1;
    let matches = [];
    let currentTabId = null;

    // 获取当前标签页ID并确保content script已注入
    try {
        const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
        if (tab) {
            currentTabId = tab.id;
            // 确保content script已注入
            await chrome.scripting.executeScript({
                target: {tabId: currentTabId},
                files: ['content.js']
            });
        }
    } catch (error) {
        console.error('初始化失败:', error);
        matchCount.textContent = '无法初始化搜索功能';
        return;
    }

    // 发送消息到content script
    async function sendMessage(action, data) {
        if (!currentTabId) {
            matchCount.textContent = '无法获取当前页面';
            return;
        }
        try {
            const response = await chrome.tabs.sendMessage(currentTabId, {action, data});
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
            }
            return response;
        } catch (error) {
            console.error('消息发送失败:', error);
            matchCount.textContent = '无法在此页面上执行搜索';
            throw error;
        }
    }

    // 执行搜索
    async function performSearch() {
        const searchText = searchInput.value;
        if (!searchText) {
            matchCount.textContent = '请输入搜索内容';
            return;
        }

        try {
            matchCount.textContent = '正在搜索...';
            const options = {
                caseSensitive: document.getElementById('caseSensitive').checked,
                wholeWord: document.getElementById('wholeWord').checked,
                regexEnabled: document.getElementById('regexEnabled').checked,
                searchMode: document.querySelector('input[name="searchMode"]:checked').value
            };

            const response = await sendMessage('search', {
                searchText,
                options
            });

            if (response && response.matches) {
                matches = response.matches;
                currentMatchIndex = matches.length > 0 ? 0 : -1;
                updateUI();
                if (matches.length > 0) {
                    await sendMessage('highlight', {index: currentMatchIndex});
                }
            }
        } catch (error) {
            console.error('搜索执行失败:', error);
            matchCount.textContent = '搜索执行失败: ' + error.message;
        }
    }

    // 更新UI显示
    function updateUI() {
        matchCount.textContent = `找到 ${matches.length} 个匹配`;
        if (matches.length > 0) {
            currentMatch.textContent = `当前: ${currentMatchIndex + 1}/${matches.length}`;
        } else {
            currentMatch.textContent = '';
        }
    }

    // 查找下一个
    async function findNext() {
        if (matches.length === 0) return;
        currentMatchIndex = (currentMatchIndex + 1) % matches.length;
        try {
            await sendMessage('highlight', {index: currentMatchIndex});
            updateUI();
        } catch (error) {
            console.error('导航失败:', error);
        }
    }

    // 查找上一个
    async function findPrev() {
        if (matches.length === 0) return;
        currentMatchIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
        try {
            await sendMessage('highlight', {index: currentMatchIndex});
            updateUI();
        } catch (error) {
            console.error('导航失败:', error);
        }
    }

    // 清空结果
    async function clearResults() {
        matches = [];
        currentMatchIndex = -1;
        try {
            await sendMessage('clear');
            updateUI();
            searchInput.value = '';
        } catch (error) {
            console.error('清除失败:', error);
        }
    }

    // 事件监听
    searchButton.addEventListener('click', performSearch);
    findNextButton.addEventListener('click', findNext);
    findPrevButton.addEventListener('click', findPrev);
    countMatchesButton.addEventListener('click', performSearch);
    clearResultsButton.addEventListener('click', clearResults);
    closeButton.addEventListener('click', () => window.close());

    // 快捷键支持
    searchInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                await findPrev();
            } else {
                await findNext();
            }
        }
    });

    // 自动聚焦到搜索输入框
    searchInput.focus();
}); 