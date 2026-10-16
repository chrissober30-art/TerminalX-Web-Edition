const SCRIPT_STORAGE_KEY = 'terminalXScripts';

function matchesPattern(url, pattern) {
    const normalizedUrl = String(url || '').trim();
    const normalizedPattern = String(pattern || '').trim();

    if (!normalizedUrl || !normalizedPattern) {
        return false;
    }

    const patternLower = normalizedPattern.toLowerCase();
    const urlLower = normalizedUrl.toLowerCase();

    if (patternLower === '<all_urls>' || patternLower === '*') {
        return true;
    }

    function escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function wildcardToRegex(value) {
        return value.split('*').map(escapeRegex).join('.*');
    }

    try {
        const schemeSeparatorIndex = patternLower.indexOf('://');
        const hasScheme = schemeSeparatorIndex !== -1;

        if (!hasScheme) {
            const regex = new RegExp(`^${wildcardToRegex(patternLower)}$`, 'i');
            return regex.test(urlLower);
        }

        const scheme = patternLower.slice(0, schemeSeparatorIndex);
        const remaining = patternLower.slice(schemeSeparatorIndex + 3);
        const pathSeparatorIndex = remaining.indexOf('/');
        const host = pathSeparatorIndex === -1 ? remaining : remaining.slice(0, pathSeparatorIndex);
        const path = pathSeparatorIndex === -1 ? '' : remaining.slice(pathSeparatorIndex);

        const schemeRegex = scheme === '*' ? 'https?' : escapeRegex(scheme);
        let hostRegex;

        if (host === '*') {
            hostRegex = scheme === 'file' ? '' : '[^/?#]+';
        } else if (host.startsWith('*.')) {
            hostRegex = `(?:[^./]+\\.)*${escapeRegex(host.slice(2))}`;
        } else {
            hostRegex = escapeRegex(host);
        }

        let pathRegex;
        if (!path) {
            pathRegex = '(?:/.*)?';
        } else if (path === '/*' || path === '*') {
            pathRegex = '(?:/.*)?';
        } else {
            pathRegex = wildcardToRegex(path);
        }

        const regex = new RegExp(`^${schemeRegex}://${hostRegex}${pathRegex}$`, 'i');
        return regex.test(urlLower);
    } catch (error) {
        return false;
    }
}

function loadScripts() {
    return new Promise((resolve) => {
        chrome.storage.local.get([SCRIPT_STORAGE_KEY], (result) => {
            resolve(result[SCRIPT_STORAGE_KEY] || []);
        });
    });
}

async function runMatchingScripts(tab) {
    if (!tab || !tab.id || !tab.url) {
        return;
    }

    const scripts = await loadScripts();
    const matchingScripts = scripts.filter(script => script && script.enabled && matchesPattern(tab.url, script.pattern));

    for (const script of matchingScripts) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (code) => {
                    try {
                        const runner = new Function(`"use strict"; return (function(){${code}\n})();`);
                        runner();
                    } catch (error) {
                        console.error('Terminal X script error:', error);
                    }
                },
                args: [script.code]
            });
        } catch (error) {
            console.error('Terminal X script injection failed:', error);
        }
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        runMatchingScripts(tab);
    }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
        const tab = await chrome.tabs.get(tabId);
        runMatchingScripts(tab);
    } catch (error) {
        console.error('Terminal X tab activation failed:', error);
    }
});
