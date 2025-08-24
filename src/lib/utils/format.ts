export function formatNumber(num: number, precision: number = 2): string {
    if (num === 0 || isNaN(num)) return '0';
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(precision) + 'B';
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(precision) + 'M';
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(precision) + 'K';
    }
    return num.toFixed(precision);
}

export function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0s';

    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hrs > 0) result += `${hrs}h `;
    if (mins > 0 || hrs > 0) result += `${mins}m `;
    result += `${secs}s`;

    return result.trim();
}

export function formatPercentage(numerator: number, denominator: number): string {
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) return '0%';
    const percentage = (numerator / denominator) * 100;
    return `${percentage.toFixed(2)}%`;
}

export function solToUsd(sol: number, solPrice: number = 187): number {
    return sol * solPrice;
}
