import { type FC } from 'react';
import { formatNumber, formatTime } from '@/lib/utils/format';

interface MetricProps {
    label: string;
    value: number | string;
    previousValue?: number;
    className?: string;
    format?: boolean;
    time?: number;
    mustFormatTime?: boolean;
    prefix?: string;
}

export const Metric: FC<MetricProps> = ({
    label,
    value,
    previousValue,
    className,
    format = true,
    time,
    mustFormatTime = true,
    prefix = '',
}) => {
    let valueStr: string;
    let colorClass = 'text-white/90';
    let icon = null;

    if (typeof value === 'number') {
        valueStr = format ? formatNumber(value) : value.toString();
        if (previousValue !== undefined) {
            if (value > previousValue) {
                colorClass = 'text-green-400';
                icon = '🔥';
            } else if (value < previousValue) {
                colorClass = 'text-red-400';
                icon = '💀';
            }
        }
    } else {
        valueStr = value;
    }

    return (
        <div className={`bg-white/5 rounded-lg px-2 py-1 ${className} flex flex-col`}>
            <div className='flex justify-between items-center'>
                <span>{label}:</span>
                <span className={`${colorClass} font-mono`}>
                    {icon} {prefix} {valueStr}
                </span>
            </div>
            {time && (
                <div className='text-xs text-white/50 text-right'>
                    {mustFormatTime ? formatTime((Date.now() - time) / 1000) + ' ago' : time}
                </div>
            )}
        </div>
    );
};

interface MetricChangeProps {
    value: number;
    label?: string;
    precision?: number;
    className?: string;
    suffix?: string;
}

export const MetricChange: FC<MetricChangeProps> = ({ value, label, precision = 2, className, suffix = '' }) => {
    const isPositive = value > 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    const sign = isPositive ? '+' : '';

    return (
        <div className={`bg-white/5 rounded-lg px-2 py-1 ${className}`}>
            {label && `${label}: `}
            <span className={`${colorClass} font-mono`}>
                {sign}
                {value.toFixed(precision)}
                {suffix}
            </span>
        </div>
    );
};
