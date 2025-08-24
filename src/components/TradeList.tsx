import type { FC } from 'react';
import type { TokenTradeData } from '@/types/token';
import { formatNumber } from '@/lib/utils/format';

interface TradeListProps {
    trades: TokenTradeData[];
    title: 'Buys' | 'Sells';
}

const TradeList: FC<TradeListProps> = ({ trades, title }) => {
    const isBuy = title === 'Buys';
    return (
        <div>
            <h4 className={`text-lg font-semibold mb-2 ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                {title} ({trades?.length ?? 0})
            </h4>
            <div className='bg-white/5 rounded-lg p-2 space-y-2 text-xs'>
                {trades?.slice(0, 20).map((trade) => (
                    <div key={trade.signature} className='grid grid-cols-3 gap-2 items-center'>
                        <div className='truncate font-mono' title={trade?.traderPublicKey}>
                            {trade?.traderPublicKey?.slice(0, 6)}...
                        </div>
                        <div className='text-right font-mono'>{formatNumber(trade?.solAmount ?? 0, 3)} SOL</div>
                        <div className='text-right font-mono'>{formatNumber(trade?.tokenAmount ?? 0)}</div>
                    </div>
                ))}
                {trades?.length === 0 && <div className='text-center text-white/50 py-2'>No {title.toLowerCase()} yet.</div>}
            </div>
        </div>
    );
};

export default TradeList;
