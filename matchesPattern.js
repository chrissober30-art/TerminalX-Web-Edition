


(function (globalObject) {
    function escapeRegex(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function wildcardToRegex(value) {
        return value.split('*').map(escapeRegex).join('.*');
    }

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

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { matchesPattern };
    }

    globalObject.matchesPattern = matchesPattern;
})(typeof window !== 'undefined' ? window : globalThis);
