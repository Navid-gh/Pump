import { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import TokenCard from '@/components/TokenCard';
import { usePumpNewTokens } from '@/hooks/usePumpNewTokens2';
import { useFavorites } from '@/hooks/useFavorites';
import type { Token } from '@/types/token';

const ITEM_HEIGHT = 420; // Approximate height of TokenCard
const WINDOW_HEIGHT = 600; // Height of the virtual list window

type Tab = 'new' | 'entered' | 'favorites';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('new');
    const { tokens, enteredTokens } = usePumpNewTokens();
    const { favorites } = useFavorites();

    // Memoize the favorite tokens calculation
    const favoriteTokens = useMemo(() => {
        const allTokens = [...tokens, ...enteredTokens];
        const filtered = allTokens.filter((t) => favorites.has(t.mint));
        return Array.from(new Map(filtered.map((item) => [item.mint, item])).values());
    }, [tokens, enteredTokens, favorites]);

    // Memoize the tokens to show based on active tab
    const tokensToShow = useMemo(() => {
        let result: Token[] = [];
        switch (activeTab) {
            case 'new':
                result = tokens;
                break;
            case 'entered':
                result = enteredTokens;
                break;
            case 'favorites':
                result = favoriteTokens;
                break;
        }
        // Sort by last trade time (most recent first)
        return result.sort((a, b) => b.lastTradeTime - a.lastTradeTime);
    }, [activeTab, tokens, enteredTokens, favoriteTokens]);

    // Memoize the tab click handler
    const handleTabClick = useCallback((tab: Tab) => {
        setActiveTab(tab);
    }, []);

    // Memoize the row renderer for the virtual list
    const Row = useCallback(
        ({ index, style }: { index: number; style: React.CSSProperties }) => {
            const token = tokensToShow[index];
            if (!token) return null;

            return (
                <div style={style}>
                    <TokenCard key={`${token.signature}-${token.mint}`} t={token} />
                </div>
            );
        },
        [tokensToShow]
    );

    // Memoize the item data for react-window
    const itemData = useMemo(
        () => ({
            tokens: tokensToShow,
        }),
        [tokensToShow]
    );

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
                    Favorites ({favoriteTokens.length})
                </button>
            </div>
            {tokensToShow.length > 0 ? (
                <List height={WINDOW_HEIGHT} itemCount={tokensToShow.length} itemSize={ITEM_HEIGHT} width='100%' itemData={itemData}>
                    {Row}
                </List>
            ) : (
                <div className='text-center text-white/50 py-8'>No tokens available in this tab.</div>
            )}
        </div>
    );
}
