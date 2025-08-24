import { useParams } from 'react-router-dom';
import { usePumpNewTokens } from '@/hooks/usePumpNewTokens2';
import TokenCard from '@/components/TokenCard';
import TradeList from '@/components/TradeList';

export default function TokenDetails() {
    const { mint } = useParams();
    const { tokens, enteredTokens } = usePumpNewTokens();

    const token = tokens?.find((t) => t?.mint === mint) || enteredTokens?.find((t) => t?.mint === mint);

    if (!token) {
        return (
            <div>
                <h3 className='text-xl font-bold mb-4'>Token not found</h3>
                <p>Could not find details for token: {mint}</p>
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            <TokenCard t={token} />
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <TradeList trades={token?.trades?.buy ?? []} title='Buys' />
                <TradeList trades={token?.trades?.sell ?? []} title='Sells' />
            </div>
        </div>
    );
}
