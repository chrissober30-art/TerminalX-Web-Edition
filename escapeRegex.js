// Background script for Terminal X Web Companion
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
exports.escapeRegex = escapeRegex;
function hostPatternToRegex(hostPattern) {
    if (!hostPattern || hostPattern === '*') return /^.*$/;

    if (hostPattern.startsWith('*.')) {
        const suffix = hostPattern.slice(2);
        const escapedSuffix = escapeRegex(suffix);
        return new RegExp(`^(?:[^.]+\\.)+${escapedSuffix}$`);
    }

    return new RegExp(`^${escapeRegex(hostPattern)}$`);
}
exports.hostPatternToRegex = hostPatternToRegex;
