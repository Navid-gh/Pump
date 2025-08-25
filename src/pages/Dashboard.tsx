import { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import TokenCard from '@/components/TokenCard';
import { usePumpNewTokens } from '@/hooks/usePumpNewTokens2';
import { useFavorites } from '@/hooks/useFavorites';
import type { Token } from '@/types/token';
import { BACKEND_URL } from '@/lib/utils/constants';

const ITEM_HEIGHT = 420; // Approximate height of TokenCard
const WINDOW_HEIGHT = 600; // Height of the virtual list window

type Tab = 'new' | 'entered' | 'favorites';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('new');
    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
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
        return result.sort((a, b) => b.timestamp - a.timestamp);
    }, [activeTab, tokens, enteredTokens, favoriteTokens]);

    // Memoize selection state
    const selectedCount = selectedTokens.size;
    const hasSelection = selectedCount > 0;
    const isAllSelected = selectedCount === tokensToShow.length && tokensToShow.length > 0;

    // Memoize the tab click handler
    const handleTabClick = useCallback((tab: Tab) => {
        setActiveTab(tab);
        setSelectedTokens(new Set()); // Clear selection when switching tabs
    }, []);

    // Memoize selection handlers
    const handleSelectToken = useCallback((mint: string, selected: boolean) => {
        setSelectedTokens((prev) => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(mint);
            } else {
                newSet.delete(mint);
            }
            return newSet;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (isAllSelected) {
            setSelectedTokens(new Set());
        } else {
            setSelectedTokens(new Set(tokensToShow.map((t) => t.mint)));
        }
    }, [isAllSelected, tokensToShow]);

    // Memoize bulk delete handler
    const handleBulkDelete = useCallback(async () => {
        if (!hasSelection || isDeleting) return;

        const confirmMessage = `Are you sure you want to delete ${selectedCount} token${selectedCount > 1 ? 's' : ''}?`;
        if (!confirm(confirmMessage)) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`${BACKEND_URL}/tokens/`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mints: Array.from(selectedTokens) }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete tokens');
            }

            // Clear selection after successful deletion
            setSelectedTokens(new Set());
        } catch (error) {
            console.error('Error deleting tokens:', error);
            alert('Failed to delete tokens. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    }, [selectedTokens, selectedCount, hasSelection, isDeleting]);

    // Memoize the row renderer for the virtual list
    const Row = useCallback(
        ({ index, style }: { index: number; style: React.CSSProperties }) => {
            const token = tokensToShow[index];
            if (!token) return null;

            return (
                <div style={style}>
                    <TokenCard
                        key={`${token.signature}-${token.mint}`}
                        t={token}
                        isSelected={selectedTokens.has(token.mint)}
                        onSelect={(selected) => handleSelectToken(token.mint, selected)}
                    />
                </div>
            );
        },
        [tokensToShow, selectedTokens, handleSelectToken]
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
                    New Active Tokens ({tokens.length})
                </button>
                <button
                    onClick={() => handleTabClick('entered')}
                    className={`pb-2 text-sm transition-colors ${
                        activeTab === 'entered' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
                    }`}>
                    Entered Active Tokens ({enteredTokens.length})
                </button>
                <button
                    onClick={() => handleTabClick('favorites')}
                    className={`pb-2 text-sm transition-colors ${
                        activeTab === 'favorites' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
                    }`}>
                    Favorites ({favoriteTokens.length})
                </button>
            </div>

            {/* Bulk Actions Bar */}
            {hasSelection && (
                <div className='mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                        <span className='text-sm text-blue-400'>
                            {selectedCount} token{selectedCount > 1 ? 's' : ''} selected
                        </span>
                        <button onClick={handleSelectAll} className='text-xs text-blue-400 hover:text-blue-300 underline'>
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className='px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-sm rounded-md transition-colors'>
                        {isDeleting ? 'Deleting...' : `Delete ${selectedCount} Token${selectedCount > 1 ? 's' : ''}`}
                    </button>
                </div>
            )}

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
