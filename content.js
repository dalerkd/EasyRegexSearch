// 调试系统
const DEBUG = {
    enabled: false,
    styles: {
        search: 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 2px;',
        highlight: 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;',
        error: 'background: #f44336; color: white; padding: 2px 5px; border-radius: 2px;',
        warning: 'background: #ff9800; color: white; padding: 2px 5px; border-radius: 2px;',
        info: 'background: #607d8b; color: white; padding: 2px 5px; border-radius: 2px;'
    },
    log: function(type, ...args) {
        if (!this.enabled) return;
        const style = this.styles[type] || this.styles.info;
        console.log(`%c[${type.toUpperCase()}]`, style, ...args);
    },
    error: function(...args) {
        if (!this.enabled) return;
        console.error(`%c[ERROR]`, this.styles.error, ...args);
    },
    warn: function(...args) {
        if (!this.enabled) return;
        console.warn(`%c[WARN]`, this.styles.warning, ...args);
    },
    // 切换调试模式
    toggle: function() {
        this.enabled = !this.enabled;
        this.log('info', `调试模式已${this.enabled ? '开启' : '关闭'}`);
        return this.enabled;
    },
    // 初始化调试模式
    init: async function() {
        try {
            // 从background script获取开发者模式状态
            const response = await chrome.runtime.sendMessage({ action: 'checkDevMode' });
            
            // 如果处于开发者模式，自动启用调试
            if (response && response.isDevelopment) {
                this.enabled = true;
                const manifest = chrome.runtime.getManifest();
                console.log(`%c[DEBUG SYSTEM]`, this.styles.info, 
                    '开发者模式已检测到，调试系统已自动启用\n' +
                    `扩展名称: ${manifest.name}\n` +
                    `版本: ${manifest.version}\n` +
                    '按 Alt+D 可以切换调试模式'
                );
            }
        } catch (error) {
            console.warn('调试系统初始化失败，将使用默认设置:', error);
        }
    }
};

// 初始化调试系统
DEBUG.init();

// 添加调试开关快捷键 (Alt+D)
document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'd') {
        DEBUG.toggle();
    }
});

let searchPanelInstance = null;

// 添加i18n工具函数
const i18n = {
    getMessage: function(key, substitutions) {
        return chrome.i18n.getMessage(key, substitutions) || key;
    }
};

// 创建搜索面板
function createSearchPanel() {
    // 如果面板已存在
    if (searchPanelInstance) {
        // 如果面板是显示状态，则隐藏它
        if (searchPanelInstance.style.display !== 'none') {
            DEBUG.log('info', '隐藏搜索面板');
            searchPanelInstance.style.display = 'none';
            clearHighlights(); // 清除高亮
            return;
        }
        // 如果面板是隐藏状态，则显示它并聚焦
        DEBUG.log('info', '显示搜索面板');
        searchPanelInstance.style.display = 'block';
        const searchInput = searchPanelInstance.querySelector('#searchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.select(); // 选中已有文本
        }
        return;
    }

    DEBUG.log('info', '创建新的搜索面板');
    // 创建面板容器
    searchPanelInstance = document.createElement('div');
    searchPanelInstance.className = 'easy-regex-search-panel';
    searchPanelInstance.innerHTML = `
        <div class="search-container">
            <div class="search-header">
                <input type="text" id="searchInput" placeholder="${i18n.getMessage('searchPlaceholder')}">
                <button id="regexHelp" title="${i18n.getMessage('regexHelpTitle')}">?</button>
                <button id="searchButton">${i18n.getMessage('searchButton')}</button>
            </div>
            
            <div class="search-options">
                <label><input type="checkbox" id="caseSensitive"> ${i18n.getMessage('caseSensitive')}</label>
                <label><input type="checkbox" id="wholeWord"> ${i18n.getMessage('wholeWord')}</label>
                <label><input type="checkbox" id="regexEnabled" checked> ${i18n.getMessage('loopSearch')}</label>
            </div>

            <div class="search-mode">
                <div class="mode-title">${i18n.getMessage('searchMode')}</div>
                <div class="mode-options">
                    <label><input type="radio" name="searchMode" value="normal"> ${i18n.getMessage('normalMode')}</label>
                    <label><input type="radio" name="searchMode" value="regex"> ${i18n.getMessage('extendedMode')}</label>
                    <label><input type="radio" name="searchMode" value="extended" checked> ${i18n.getMessage('regexMode')}</label>
                </div>
            </div>

            <div class="button-group">
                <button id="findNext">${i18n.getMessage('findNext')}</button>
                <button id="findPrev">${i18n.getMessage('findPrev')}</button>
                <button id="countMatches">${i18n.getMessage('count')}</button>
                <button id="clearResults">${i18n.getMessage('clearResults')}</button>
                <button id="closePanel">${i18n.getMessage('close')}</button>
                <span style="
                    float: right; 
                    font-size: 18px;
                    font-family: 'Arial Black', Gadget, sans-serif;
                    background: linear-gradient(45deg, #2196F3, #4CAF50);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-weight: bold;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                    margin-top: -2px;
                    letter-spacing: 1px;
                ">Easy Regex Search</span>
            </div>

            <div id="results" class="results">
                <div id="matchCount"></div>
                <div id="currentMatch"></div>
            </div>

            <!-- 正则表达式帮助菜单 -->
            <div id="regexHelpMenu" class="regex-help-menu" style="display: none;">
                <div class="regex-help-item" data-pattern="\\d">${i18n.getMessage('regexDigit')}</div>
                <div class="regex-help-item" data-pattern="\\r\\n">${i18n.getMessage('regexNewline')}</div>
                <div class="regex-help-item" data-pattern="\\s">${i18n.getMessage('regexWhitespace')}</div>
                <div class="regex-help-item" data-pattern="*">${i18n.getMessage('regexLineStart')}</div>
                <div class="regex-help-item" data-pattern="$">${i18n.getMessage('regexLineEnd')}</div>
                <div class="regex-help-item" data-pattern=".">${i18n.getMessage('regexAnyChar')}</div>
                <div class="regex-help-item" data-pattern="\\w">${i18n.getMessage('regexWordChar')}</div>
                <div class="regex-help-item" data-pattern="[\\p{Script=Han}]">${i18n.getMessage('regexChinese')}</div>
                <div class="regex-help-item" data-pattern="[a-zA-Z0-9]">${i18n.getMessage('regexAlphaNum')}</div>
                <div class="regex-help-item" data-pattern="+">${i18n.getMessage('regexOneOrMore')}</div>
            </div>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .easy-regex-search-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 350px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 999999;
            font-family: Arial, sans-serif;
            padding: 10px;
        }

        .easy-regex-search-panel .search-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .easy-regex-search-panel .search-header {
            display: flex;
            gap: 10px;
        }

        .easy-regex-search-panel #searchInput {
            flex: 1;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .easy-regex-search-panel button {
            padding: 5px 10px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
        }

        .easy-regex-search-panel button:hover {
            background-color: #e0e0e0;
        }

        .easy-regex-search-panel .search-options,
        .easy-regex-search-panel .search-mode {
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 5px;
            border: 1px solid #eee;
            border-radius: 4px;
        }

        .easy-regex-search-panel .mode-title {
            text-align: left;
            margin-left: 5px;
        }

        .easy-regex-search-panel .mode-options {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-left: 5px;
        }

        .easy-regex-search-panel .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }

        .easy-regex-search-panel .results {
            margin-top: 10px;
            padding: 5px;
            border: 1px solid #eee;
            border-radius: 4px;
            min-height: 50px;
        }

        .easy-regex-search-panel label {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .easy-regex-search-panel-highlight {
            background-color: yellow;
        }

        .easy-regex-search-panel-current {
            background-color: orange;
        }

        #regexHelp {
            padding: 5px 10px;
            margin-right: 5px;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }

        .regex-help-menu {
            position: absolute;
            top: 40px;
            left: 10px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000000;
            max-height: 300px;
            overflow-y: auto;
            width: 280px;
        }

        .regex-help-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            transition: background-color 0.2s;
        }

        .regex-help-item:last-child {
            border-bottom: none;
        }

        .regex-help-item:hover {
            background-color: #f5f5f5;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(searchPanelInstance);

    // 添加拖动功能
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    searchPanelInstance.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === searchPanelInstance) {
            isDragging = true;
        }
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            xOffset = currentX;
            yOffset = currentY;

            setTranslate(currentX, currentY, searchPanelInstance);
        }
    }

    function dragEnd(e) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    }

    function setTranslate(xPos, yPos, el) {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }

    // 初始化搜索功能
    initializeSearch();

    // 自动聚焦到搜索输入框
    const searchInput = searchPanelInstance.querySelector('#searchInput');
    if (searchInput) {
        setTimeout(() => {
            searchInput.focus();
        }, 100); // 短暂延时确保DOM完全加载
    }
}

// 全局搜索状态管理
const searchState = {
    highlights: [],
    currentHighlight: null,
    currentMatchIndex: -1,
    matches: [],
    lastSearchText: ''
};

// 全局搜索函数
async function performSearch() {
    const searchInput = searchPanelInstance.querySelector('#searchInput');
    const matchCount = searchPanelInstance.querySelector('#matchCount');
    const searchButton = searchPanelInstance.querySelector('#searchButton');
    const findNextButton = searchPanelInstance.querySelector('#findNext');
    const findPrevButton = searchPanelInstance.querySelector('#findPrev');
    const currentMatch = searchPanelInstance.querySelector('#currentMatch');

    const searchText = searchInput.value;
    if (!searchText) {
        matchCount.textContent = i18n.getMessage('noSearchText');
        return;
    }

    // 保存当前搜索文本
    searchState.lastSearchText = searchText;

    clearHighlights();
    matchCount.textContent = i18n.getMessage('searching', ['0']);
    searchButton.disabled = true;
    findNextButton.disabled = true;
    findPrevButton.disabled = true;

    try {
        const options = {
            caseSensitive: searchPanelInstance.querySelector('#caseSensitive').checked,
            wholeWord: searchPanelInstance.querySelector('#wholeWord').checked,
            regexEnabled: searchPanelInstance.querySelector('#regexEnabled').checked,
            searchMode: searchPanelInstance.querySelector('input[name="searchMode"]:checked').value
        };

        searchState.matches = await performTextSearch(searchText, options);
        searchState.currentMatchIndex = searchState.matches.length > 0 ? 0 : -1;
        
        // 更新UI
        const count = searchState.matches.length;
        matchCount.textContent = i18n.getMessage('matchesFound', [count.toString()]);
        
        if (count > 0) {
            currentMatch.textContent = i18n.getMessage('currentMatch', [
                (searchState.currentMatchIndex + 1).toString(),
                count.toString()
            ]);
            highlightMatch(searchState.currentMatchIndex);
        } else {
            currentMatch.textContent = '';
        }
    } catch (error) {
        DEBUG.error('搜索失败:', error);
        matchCount.textContent = i18n.getMessage('searchFailed', [error.message]);
    } finally {
        searchButton.disabled = false;
        findNextButton.disabled = false;
        findPrevButton.disabled = false;
    }
}

// 更新UI显示
function updateUI() {
    if (!searchPanelInstance) return;
    const matchCount = searchPanelInstance.querySelector('#matchCount');
    const currentMatch = searchPanelInstance.querySelector('#currentMatch');
    const count = searchState.matches.length;
    
    matchCount.textContent = i18n.getMessage('matchesFound', [count.toString()]);
    
    if (count > 0) {
        currentMatch.textContent = i18n.getMessage('currentMatch', [
            (searchState.currentMatchIndex + 1).toString(),
            count.toString()
        ]);
    } else {
        currentMatch.textContent = '';
    }
    DEBUG.log('info', `UI更新 - 匹配数: ${count}, 当前索引: ${searchState.currentMatchIndex + 1}`);
}

// 查找下一个
function findNext() {
    if (!searchPanelInstance || searchState.matches.length === 0) return;
    searchState.currentMatchIndex = (searchState.currentMatchIndex + 1) % searchState.matches.length;
    highlightMatch(searchState.currentMatchIndex);
    updateUI();
}

// 查找上一个
function findPrev() {
    if (!searchPanelInstance || searchState.matches.length === 0) return;
    searchState.currentMatchIndex = (searchState.currentMatchIndex - 1 + searchState.matches.length) % searchState.matches.length;
    highlightMatch(searchState.currentMatchIndex);
    updateUI();
}

// 清空结果
function clearResults() {
    if (!searchPanelInstance) return;
    const searchInput = searchPanelInstance.querySelector('#searchInput');
    searchState.matches = [];
    searchState.currentMatchIndex = -1;
    clearHighlights();
    updateUI();
    searchInput.value = '';
}

// 初始化搜索功能
function initializeSearch() {
    const searchInput = searchPanelInstance.querySelector('#searchInput');
    const searchButton = searchPanelInstance.querySelector('#searchButton');
    const findNextButton = searchPanelInstance.querySelector('#findNext');
    const findPrevButton = searchPanelInstance.querySelector('#findPrev');
    const countMatchesButton = searchPanelInstance.querySelector('#countMatches');
    const clearResultsButton = searchPanelInstance.querySelector('#clearResults');
    const closeButton = searchPanelInstance.querySelector('#closePanel');

    // ESC键监听
    searchPanelInstance.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchPanelInstance.style.display = 'none';
            clearHighlights();
        }
        // 当按下回车键时执行搜索
        // 但如果焦点在搜索输入框中，则使用原有的查找下一个/上一个功能
        if (e.key === 'Enter' && e.target !== searchInput) {
            e.preventDefault();
            performSearch();
        }
    });

    // 事件监听
    searchButton.addEventListener('click', performSearch);
    findNextButton.addEventListener('click', findNext);
    findPrevButton.addEventListener('click', findPrev);
    countMatchesButton.addEventListener('click', performSearch);
    clearResultsButton.addEventListener('click', clearResults);
    closeButton.addEventListener('click', () => {
        searchPanelInstance.style.display = 'none';
        clearHighlights();
    });

    // 快捷键支持
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            // 如果当前没有搜索结果，或者搜索文本已经改变，则执行新搜索
            const currentSearchText = searchInput.value;
            const lastSearchText = searchState.lastSearchText || '';
            
            if (searchState.matches.length === 0 || currentSearchText !== lastSearchText) {
                performSearch();
            } else {
                // 否则执行查找下一个/上一个
                if (e.shiftKey) {
                    findPrev();
                } else {
                    findNext();
                }
            }
        }
    });

    // 自动聚焦到搜索输入框
    searchInput.focus();

    // 添加正则帮助功能
    const regexHelpButton = searchPanelInstance.querySelector('#regexHelp');
    const regexHelpMenu = searchPanelInstance.querySelector('#regexHelpMenu');

    // 切换帮助菜单显示
    regexHelpButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = regexHelpMenu.style.display === 'block';
        regexHelpMenu.style.display = isVisible ? 'none' : 'block';
    });

    // 点击其他地方时隐藏菜单
    document.addEventListener('click', () => {
        regexHelpMenu.style.display = 'none';
    });

    // 防止菜单点击事件冒泡
    regexHelpMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 处理正则帮助项点击
    const helpItems = searchPanelInstance.querySelectorAll('.regex-help-item');
    helpItems.forEach(item => {
        item.addEventListener('click', () => {
            const pattern = item.getAttribute('data-pattern');
            const cursorPos = searchInput.selectionStart;
            const currentValue = searchInput.value;
            
            // 在光标位置插入正则表达式
            searchInput.value = currentValue.slice(0, cursorPos) + pattern + currentValue.slice(cursorPos);
            
            // 更新光标位置
            const newPos = cursorPos + pattern.length;
            searchInput.setSelectionRange(newPos, newPos);
            
            // 聚焦输入框
            searchInput.focus();
            
            // 隐藏菜单
            regexHelpMenu.style.display = 'none';
        });
    });
}

// 清除所有高亮
function clearHighlights() {
    DEBUG.log('info', `清除 ${searchState.highlights.length} 个高亮`);
    
    searchState.highlights.forEach((highlight, index) => {
        const parent = highlight.parentNode;
        if (parent) {
            try {
                parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
                parent.normalize();
            } catch (e) {
                DEBUG.error(`清除第 ${index} 个高亮失败:`, e);
            }
        }
    });
    
    searchState.highlights = [];
    searchState.currentHighlight = null;
    DEBUG.log('info', '高亮清除完成');
}

// 创建正则表达式
function createRegex(searchText, options) {
    DEBUG.log('info', '创建正则表达式', { searchText, options });
    
    // 添加 Unicode 标志 'u'
    let flags = 'g';
    if (!options.caseSensitive) flags += 'i';
    flags += 'u'; // 添加Unicode支持

    let pattern = searchText;
    if (options.searchMode === 'normal') {
        pattern = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else if (options.searchMode === 'regex') {
        pattern = searchText.replace(/\\n/g, '\n')
                          .replace(/\\r/g, '\r')
                          .replace(/\\t/g, '\t')
                          .replace(/\\0/g, '\0');
    }

    if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
    }

    try {
        const regex = new RegExp(pattern, flags);
        DEBUG.log('info', '正则表达式创建成功:', regex);
        return regex;
    } catch (e) {
        DEBUG.error('正则表达式创建失败:', e);
        return null;
    }
}

// 搜索文本
function performTextSearch(searchText, options) {
    DEBUG.log('search', '开始搜索', { searchText, options });
    
    const regex = createRegex(searchText, options);
    if (!regex) {
        DEBUG.error('创建正则表达式失败');
        return [];
    }
    DEBUG.log('search', '正则表达式创建成功:', regex);

    const matches = [];
    const textNodes = [];
    
    // 首先收集所有文本节点
    DEBUG.log('search', '开始收集文本节点...');
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                const accept = node.parentNode.tagName !== 'SCRIPT' &&
                       node.parentNode.tagName !== 'STYLE' &&
                       node.parentNode.tagName !== 'TEXTAREA' &&
                       !node.parentNode.isContentEditable &&
                       !node.parentNode.closest('.easy-regex-search-panel');
                
                DEBUG.log('search', `检查节点 ${node.parentNode.tagName}:`, 
                    node.textContent.substring(0, 50) + '...', 
                    accept ? '接受' : '拒绝'
                );
                
                return accept ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        }
    );

    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim()) {
            textNodes.push(node);
        }
    }
    DEBUG.log('search', `收到 ${textNodes.length} 个文本节点`);

    // 分批处理文本节点
    const batchSize = 100;
    let processedNodes = 0;
    const totalNodes = textNodes.length;

    function processNextBatch() {
        const endIndex = Math.min(processedNodes + batchSize, totalNodes);
        const progressPercent = Math.round((processedNodes / totalNodes) * 100);
        
        DEBUG.log('search', `处理批次 ${processedNodes}-${endIndex}, 进度: ${progressPercent}%`);
        
        // 更新进度显示
        const matchCount = searchPanelInstance.querySelector('#matchCount');
        matchCount.textContent = i18n.getMessage('searching', [progressPercent]);

        // 处理当前批次的节点
        for (let i = processedNodes; i < endIndex; i++) {
            const node = textNodes[i];
            const text = node.textContent;
            const allMatches = [];
            let match;

            // 首先收集所有匹配
            while (match = regex.exec(text)) {
                allMatches.push({
                    index: match.index,
                    length: match[0].length,
                    text: match[0]
                });
            }

            // 如果有匹配，从后向前处理，样不会影响前面匹配的索引
            if (allMatches.length > 0) {
                DEBUG.log('highlight', `节点找到 ${allMatches.length} 个匹配`);
                
                // 从后向前处理匹配项
                for (let j = allMatches.length - 1; j >= 0; j--) {
                    const match = allMatches[j];
                    try {
                        DEBUG.log('highlight', `处理匹配: "${match.text}" at index ${match.index}`);
                        
                        const range = document.createRange();
                        range.setStart(node, match.index);
                        range.setEnd(node, match.index + match.length);
                        
                        const span = document.createElement('span');
                        span.className = 'easy-regex-search-panel-highlight';
                        
                        range.surroundContents(span);
                        searchState.highlights.push(span);
                        matches.push({
                            element: span,
                            text: match.text
                        });
                    } catch (e) {
                        DEBUG.error('高亮处理失败:', e, {
                            nodeText: text,
                            matchIndex: match.index,
                            matchLength: match.length
                        });
                        continue;
                    }
                }
            }
        }

        processedNodes = endIndex;

        if (processedNodes < totalNodes) {
            setTimeout(processNextBatch, 0);
            return null;
        }

        DEBUG.log('search', `搜索完成，找到 ${matches.length} 个匹配`);
        return matches;
    }

    return new Promise((resolve) => {
        function checkResult() {
            const result = processNextBatch();
            if (result === null) {
                setTimeout(checkResult, 100);
                return;
            }
            resolve(result);
        }
        checkResult();
    });
}

// 高亮特定匹配
function highlightMatch(index) {
    DEBUG.log('highlight', `高亮匹配项 ${index + 1}/${searchState.highlights.length}`);
    
    if (searchState.currentHighlight) {
        DEBUG.log('highlight', '重置当前高亮');
        searchState.currentHighlight.className = 'easy-regex-search-panel-highlight';
    }
    
    if (index >= 0 && index < searchState.highlights.length) {
        searchState.currentHighlight = searchState.highlights[index];
        searchState.currentHighlight.className = 'easy-regex-search-panel-current';
        
        DEBUG.log('highlight', '滚动到当前匹配');
        searchState.currentHighlight.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

// 创建欢迎引导弹窗
function createWelcomeGuide() {
    const guideContainer = document.createElement('div');
    guideContainer.className = 'easy-regex-search-welcome';
    guideContainer.innerHTML = `
        <div class="welcome-content">
            <div class="welcome-header">
                <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Logo" class="welcome-logo">
                <h2>${i18n.getMessage('extensionName')}</h2>
            </div>
            <p>${i18n.getMessage('extensionDescription').split('.')[0]}。</p>
            <div class="shortcut-demo">
                <span class="key">Ctrl</span> + 
                <span class="key">Shift</span> + 
                <span class="key">F</span>
            </div>
            <button class="welcome-got-it">${i18n.getMessage('close')}</button>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .easy-regex-search-welcome {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            animation: fadeIn 0.3s ease-out;
        }

        .welcome-content {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            text-align: center;
            animation: slideIn 0.3s ease-out;
        }

        .welcome-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 20px;
        }

        .welcome-logo {
            width: 48px;
            height: 48px;
        }

        .welcome-header h2 {
            margin: 0;
            color: #2196F3;
            font-size: 24px;
        }

        .shortcut-demo {
            margin: 25px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            font-size: 18px;
        }

        .key {
            background: #f0f0f0;
            border: 1px solid #ccc;
            padding: 5px 10px;
            border-radius: 4px;
            box-shadow: 0 2px 3px rgba(0,0,0,0.1);
            font-family: monospace;
        }

        .welcome-got-it {
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .welcome-got-it:hover {
            background: #1976D2;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from {
                transform: translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(guideContainer);

    // 点击关闭按钮或背景时关闭引导
    const closeButton = guideContainer.querySelector('.welcome-got-it');
    closeButton.addEventListener('click', () => {
        guideContainer.remove();
    });
    guideContainer.addEventListener('click', (e) => {
        if (e.target === guideContainer) {
            guideContainer.remove();
        }
    });
}

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleSearch') {
        createSearchPanel();
        sendResponse({success: true});
    } else if (request.action === 'showWelcomeGuide') {
        createWelcomeGuide();
        sendResponse({success: true});
    }
    return true;
});

// 添加F3和F4键监听
document.addEventListener('keydown', function(e) {
    if (!searchPanelInstance) return;
    
    // 如果按下F3
    if (e.key === 'F3') {
        e.preventDefault(); // 阻止浏览器默认的查找行为
        
        // 如果搜索面板不可见，先显示它
        if (searchPanelInstance.style.display === 'none') {
            searchPanelInstance.style.display = 'block';
        }
        
        // 如果还没有执行过搜索，先执行搜索
        if (searchState.matches.length === 0) {
            performSearch();
        } else {
            // 否则查找下一个
            findNext();
        }
    }
    
    // 如果按下F4
    if (e.key === 'F4') {
        e.preventDefault();
        
        // 如果搜索面板不可见，先显示它
        if (searchPanelInstance.style.display === 'none') {
            searchPanelInstance.style.display = 'block';
        }
        
        // 如果还没有执行过搜索，先执行搜索
        if (searchState.matches.length === 0) {
            performSearch();
        } else {
            // 否则查找上一个
            findPrev();
        }
    }
}); 