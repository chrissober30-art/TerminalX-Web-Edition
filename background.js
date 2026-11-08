
uire("./escapeRegex");

function pathPatternToRegex(pathPattern) {
    if (!pathPattern || pathPattern === '*' || pathPattern === '/') return /^.*$/;

    const escaped = escapeRegex(pathPattern).replace(/\\\*/g, '.*');
    return new RegExp(`^${escaped}$`);
}

function matchesPattern(url, pattern) {
    if (!url || !pattern) return false;
    if (pattern === '<all_urls>' || pattern === '*') return true;

    try {
        const parsedUrl = new URL(url);
        const matchData = pattern.match(/^([a-zA-Z*]+):\/\/([^/]*)(\/.*)?$/);

        if (!matchData) {
            return false;
        }

        const [, schemePattern, hostPattern, rawPathPattern = ''] = matchData;
        const allowedProtocols = schemePattern === '*' ? ['http:', 'https:', 'ws:', 'wss:'] : [schemePattern + ':'];
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
            return false;
        }

        if (!hostPatternToRegex(hostPattern).test(parsedUrl.hostname)) {
            return false;
        }

        return pathPatternToRegex(rawPathPattern).test(parsedUrl.pathname + parsedUrl.search + parsedUrl.hash);
    } catch (error) {
        return false;
    }
}

if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url) {
            chrome.storage.local.get(['terminalXScripts'], (result) => {
                const scripts = result.terminalXScripts || [];
                scripts.forEach(script => {
                    if (script.enabled && matchesPattern(tab.url, script.pattern)) {
                        console.log(`Injecting script: ${script.name} into ${tab.url}`);
                        chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            func: (code) => {
                                try {
                                    const s = document.createElement('script');
                                    s.textContent = code;
                                    (document.head || document.documentElement).appendChild(s);
                                    s.remove();
                                } catch (e) {
                                    console.error("Terminal X Injection Error:", e);
                                }
                            },
                            args: [script.code]
                        });
                    }
                });
            });
        }
    });
}

if (typeof module !== 'undefined') {
    module.exports = { matchesPattern };
}
