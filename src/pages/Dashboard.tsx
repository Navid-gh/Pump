import { useState } from 'react';
import TokenCard from '@/components/TokenCard';
import { usePumpNewTokens } from '@/hooks/usePumpNewTokens2';
import { useFavorites } from '@/hooks/useFavorites';
import type { Token } from '@/types/token';

type Tab = 'new' | 'entered' | 'favorites';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('new');
    const { tokens, enteredTokens } = usePumpNewTokens();
    const { favorites } = useFavorites();

    const favoriteTokens = [...tokens, ...enteredTokens].filter((t) => favorites.has(t.mint));
    const uniqueFavoriteTokens = Array.from(new Map(favoriteTokens.map((item) => [item.mint, item])).values());

    const getTokensToShow = (): Token[] => {
        switch (activeTab) {
            case 'new':
                return tokens;
            case 'entered':
                return enteredTokens;
            case 'favorites':
                return uniqueFavoriteTokens;
            default:
                return [];
        }
    };

    const tokensToShow = getTokensToShow();
    const handleTabClick = (tab: Tab) => setActiveTab(tab);

    return (
        <div>
            <div className='flex space-x-4 mb-4 border-b border-gray-700'>
                <button
                    onClick={() => handleTabClick('new')}
                    className={`pb-2 text-sm transition-colors ${
                        activeTab === 'new' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
                    }`}>
                    New Tokens ({tokens.length})
                </button>
                <button
                    onClick={() => handleTabClick('entered')}
                    className={`pb-2 text-sm transition-colors ${
                        activeTab === 'entered' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
                    }`}>
                    Entered Tokens ({enteredTokens.length})
                </button>
                <button
                    onClick={() => handleTabClick('favorites')}
                    className={`pb-2 text-sm transition-colors ${
                        activeTab === 'favorites' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
                    }`}>
                    Favorites ({uniqueFavoriteTokens.length})
                </button>
            </div>
            <div className='grid gap-3'>
                {tokensToShow
                    .sort((a, b) => b.lastTradeTime - a.lastTradeTime)
                    .map((t) => (
                        <TokenCard key={`${t.signature}-${t.mint}`} t={t} />
                    ))}
            </div>
        </div>
    );
}
