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
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

export function formatPercentage(numerator: number, denominator: number): string {
    if (denominator === 0 || isNaN(numerator) || isNaN(denominator)) return '0%';
    const percentage = (numerator / denominator) * 100;
    return `${percentage.toFixed(2)}%`;
}

export function solToUsd(sol: number, solPrice: number = 187): number {
    return sol * solPrice;
}
