import { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import TokenCard from '@/components/TokenCard';
import { usePumpNewTokens } from '@/hooks/usePumpNewTokens2';
import { useFavorites } from '@/hooks/useFavorites';
import type { Token } from '@/types/token';
import { BACKEND_URL } from '@/lib/utils/constants';
import * as XLSX from 'xlsx';

const ITEM_HEIGHT = 420; // Approximate height of TokenCard
const WINDOW_HEIGHT = 600; // Height of the virtual list window

type Tab = 'new' | 'entered' | 'favorites';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('new');
    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [exportStartDate, setExportStartDate] = useState<string>('');
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

    // Export function to Excel
    const handleExportToExcel = useCallback(() => {
        if (tokensToShow.length === 0) {
            alert('No data to export.');
            return;
        }

        // Filter tokens based on selected start date and time
        let filteredTokens = tokensToShow;
        if (exportStartDate) {
            const startDate = new Date(exportStartDate).getTime();
            filteredTokens = tokensToShow.filter((token) => token.timestamp >= startDate);

            if (filteredTokens.length === 0) {
                alert('No tokens found for the selected date and time range.');
                return;
            }
        }

        try {
            // Create workbook
            const workbook = XLSX.utils.book_new();

            // 1. Main Token Data Worksheet
            const mainTokenData = filteredTokens.map((token) => ({
                'Token Name': token.name ?? 'N/A',
                'Mint Address': token.mint ?? 'N/A',
                Symbol: token.symbol ?? 'N/A',
                'Market Cap (SOL)': token.marketCapSol ?? 'N/A',
                'SOL Amount': token.solAmount ?? 'N/A',
                'Initial Buy': token.initialBuy ?? 'N/A',
                URI: token.uri ?? 'N/A',
                Pool: token.pool ?? 'N/A',
                'Transaction Type': token.txType ?? 'N/A',
                'Trader Public Key': token.traderPublicKey ?? 'N/A',
                'vTokens In Bonding Curve': token.vTokensInBondingCurve ?? 'N/A',
                'vSOL In Bonding Curve': token.vSolInBondingCurve ?? 'N/A',
                Timestamp: token.timestamp ? new Date(token.timestamp).toLocaleString() : 'N/A',
                'Last Trade Time': token.lastTradeTime ? new Date(token.lastTradeTime).toLocaleString() : 'N/A',
                'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                Tab: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
                'Entry Point Market Cap': token.entryPoint?.marketCapSol ?? 'N/A',
                'Entry Point Timestamp': token.entryPoint?.timestamp ? new Date(token.entryPoint.timestamp).toLocaleString() : 'N/A',
                'MC Multiplier': token.mcMultiplier ?? 'N/A',
                'Max Market Cap': token.marketCap?.max?.marketCapSol ?? 'N/A',
                'Max Market Cap Time': token.marketCap?.max?.timestamp ? new Date(token.marketCap.max.timestamp).toLocaleString() : 'N/A',
                'Min Market Cap': token.marketCap?.min?.marketCapSol ?? 'N/A',
                'Min Market Cap Time': token.marketCap?.min?.timestamp ? new Date(token.marketCap.min.timestamp).toLocaleString() : 'N/A',
                'Current to Initial Ratio': token.marketCap?.curToInitial ?? 'N/A',
                'Current to Initial Per Minute': token.marketCap?.curToInitialPerMinute ?? 'N/A',
                'Market Cap Slope (per min)': token.marketCap?.dMCdtPerMin ?? 'N/A',
                'Market Cap Acceleration (per min²)': token.marketCap?.d2MCdt2PerMin2 ?? 'N/A',
                'Volume Buy': token.volume?.buy ?? 'N/A',
                'Volume Sell': token.volume?.sell ?? 'N/A',
                'Buy/Sell Ratio': token.volume?.buyToSellRatio ?? 'N/A',
                'Volume Difference': token.volume?.diff ?? 'N/A',
                'TPM Buy': token.tpm?.buy ?? 'N/A',
                'TPM Sell': token.tpm?.sell ?? 'N/A',
                'TPM All': token.tpm?.all ?? 'N/A',
                'Image URL': token.image ?? 'N/A',
                Signature: token.signature ?? 'N/A',
            }));

            const mainWorksheet = XLSX.utils.json_to_sheet(mainTokenData);
            mainWorksheet['!cols'] = [
                { wch: 20 }, // Token Name
                { wch: 44 }, // Mint Address
                { wch: 15 }, // Symbol
                { wch: 18 }, // Market Cap (SOL)
                { wch: 15 }, // SOL Amount
                { wch: 15 }, // Initial Buy
                { wch: 30 }, // URI
                { wch: 20 }, // Pool
                { wch: 20 }, // Transaction Type
                { wch: 44 }, // Trader Public Key
                { wch: 25 }, // vTokens In Bonding Curve
                { wch: 25 }, // vSOL In Bonding Curve
                { wch: 20 }, // Timestamp
                { wch: 20 }, // Last Trade Time
                { wch: 12 }, // Is Favorite
                { wch: 12 }, // Tab
                { wch: 20 }, // Entry Point Market Cap
                { wch: 20 }, // Entry Point Timestamp
                { wch: 15 }, // MC Multiplier
                { wch: 20 }, // Max Market Cap
                { wch: 20 }, // Max Market Cap Time
                { wch: 20 }, // Min Market Cap
                { wch: 20 }, // Min Market Cap Time
                { wch: 25 }, // Current to Initial Ratio
                { wch: 30 }, // Current to Initial Per Minute
                { wch: 30 }, // Market Cap Slope
                { wch: 35 }, // Market Cap Acceleration
                { wch: 15 }, // Volume Buy
                { wch: 15 }, // Volume Sell
                { wch: 18 }, // Buy/Sell Ratio
                { wch: 20 }, // Volume Difference
                { wch: 15 }, // TPM Buy
                { wch: 15 }, // TPM Sell
                { wch: 15 }, // TPM All
                { wch: 30 }, // Image URL
                { wch: 44 }, // Signature
            ];
            XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Main Token Data');

            // 2. All Trades Worksheet
            const allTradesData: any[] = [];
            filteredTokens.forEach((token) => {
                if (token.trades?.all && token.trades.all.length > 0) {
                    token.trades.all.forEach((trade) => {
                        allTradesData.push({
                            'Token Name': token.name ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Trade Signature': trade.signature ?? 'N/A',
                            'Transaction Type': trade.txType ?? 'N/A',
                            'Token Amount': trade.tokenAmount ?? 'N/A',
                            'SOL Amount': trade.solAmount ?? 'N/A',
                            'Market Cap (SOL)': trade.marketCapSol ?? 'N/A',
                            'vTokens In Bonding Curve': trade.vTokensInBondingCurve ?? 'N/A',
                            'vSOL In Bonding Curve': trade.vSolInBondingCurve ?? 'N/A',
                            'Trader Public Key': trade.traderPublicKey ?? 'N/A',
                            'Trade Timestamp': trade.timestamp ? new Date(trade.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }
            });

            if (allTradesData.length > 0) {
                const tradesWorksheet = XLSX.utils.json_to_sheet(allTradesData);
                tradesWorksheet['!cols'] = [
                    { wch: 20 }, // Token Name
                    { wch: 44 }, // Mint Address
                    { wch: 15 }, // Symbol
                    { wch: 44 }, // Trade Signature
                    { wch: 20 }, // Transaction Type
                    { wch: 18 }, // Token Amount
                    { wch: 18 }, // SOL Amount
                    { wch: 18 }, // Market Cap (SOL)
                    { wch: 25 }, // vTokens In Bonding Curve
                    { wch: 25 }, // vSOL In Bonding Curve
                    { wch: 44 }, // Trader Public Key
                    { wch: 20 }, // Trade Timestamp
                    { wch: 12 }, // Is Favorite
                ];
                XLSX.utils.book_append_sheet(workbook, tradesWorksheet, 'All Trades');
            }

            // 3. Buy Trades Worksheet
            const buyTradesData: any[] = [];
            filteredTokens.forEach((token) => {
                if (token.trades?.buy && token.trades.buy.length > 0) {
                    token.trades.buy.forEach((trade) => {
                        buyTradesData.push({
                            'Token Name': token.name ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Trade Signature': trade.signature ?? 'N/A',
                            'Token Amount': trade.tokenAmount ?? 'N/A',
                            'SOL Amount': trade.solAmount ?? 'N/A',
                            'Market Cap (SOL)': trade.marketCapSol ?? 'N/A',
                            'Trader Public Key': trade.traderPublicKey ?? 'N/A',
                            'Trade Timestamp': trade.timestamp ? new Date(trade.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }
            });

            if (buyTradesData.length > 0) {
                const buyTradesWorksheet = XLSX.utils.json_to_sheet(buyTradesData);
                buyTradesWorksheet['!cols'] = [
                    { wch: 20 }, // Token Name
                    { wch: 44 }, // Mint Address
                    { wch: 15 }, // Symbol
                    { wch: 44 }, // Trade Signature
                    { wch: 18 }, // Token Amount
                    { wch: 18 }, // SOL Amount
                    { wch: 18 }, // Market Cap (SOL)
                    { wch: 44 }, // Trader Public Key
                    { wch: 20 }, // Trade Timestamp
                    { wch: 12 }, // Is Favorite
                ];
                XLSX.utils.book_append_sheet(workbook, buyTradesWorksheet, 'Buy Trades');
            }

            // 4. Sell Trades Worksheet
            const sellTradesData: any[] = [];
            filteredTokens.forEach((token) => {
                if (token.trades?.sell && token.trades.sell.length > 0) {
                    token.trades.sell.forEach((trade) => {
                        sellTradesData.push({
                            'Token Name': token.name ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Trade Signature': trade.signature ?? 'N/A',
                            'Token Amount': trade.tokenAmount ?? 'N/A',
                            'SOL Amount': trade.solAmount ?? 'N/A',
                            'Market Cap (SOL)': trade.marketCapSol ?? 'N/A',
                            'Trader Public Key': trade.traderPublicKey ?? 'N/A',
                            'Trade Timestamp': trade.timestamp ? new Date(trade.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }
            });

            if (sellTradesData.length > 0) {
                const sellTradesWorksheet = XLSX.utils.json_to_sheet(sellTradesData);
                sellTradesWorksheet['!cols'] = [
                    { wch: 20 }, // Token Name
                    { wch: 44 }, // Mint Address
                    { wch: 15 }, // Symbol
                    { wch: 35 }, // Trade Signature
                    { wch: 18 }, // Token Amount
                    { wch: 18 }, // SOL Amount
                    { wch: 18 }, // Market Cap (SOL)
                    { wch: 44 }, // Trader Public Key
                    { wch: 20 }, // Trade Timestamp
                    { wch: 12 }, // Is Favorite
                ];
                XLSX.utils.book_append_sheet(workbook, sellTradesWorksheet, 'Sell Trades');
            }

            // 5. Trader Details Worksheet
            const traderDetailsData: any[] = [];
            filteredTokens.forEach((token) => {
                // Higher 1 SOL Buyers
                if (token.traders?.higher1SolBuyers) {
                    Object.entries(token.traders.higher1SolBuyers).forEach(([trader, data]) => {
                        traderDetailsData.push({
                            'Token Name': token.name ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Trader Type': 'Higher 1 SOL Buyer',
                            'Trader Public Key': trader ?? 'N/A',
                            Amount: data?.amount ?? 'N/A',
                            Timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }

                // Higher 1 SOL Sellers
                if (token.traders?.higher1SolSellers) {
                    Object.entries(token.traders.higher1SolSellers).forEach(([trader, data]) => {
                        traderDetailsData.push({
                            'Token Name': token.name ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Trader Type': 'Higher 1 SOL Seller',
                            'Trader Public Key': trader ?? 'N/A',
                            Amount: data?.amount ?? 'N/A',
                            Timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }

                // Regular Buyers
                if (token.traders?.buyers) {
                    Object.entries(token.traders.buyers).forEach(([trader, data]) => {
                        traderDetailsData.push({
                            'Token Name': token.name ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            'Trader Type': 'Buyer',
                            'Trader Public Key': trader ?? 'N/A',
                            Amount: data?.amount ?? 'N/A',
                            Timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }

                // Regular Sellers
                if (token.traders?.sellers) {
                    Object.entries(token.traders.sellers).forEach(([trader, data]) => {
                        traderDetailsData.push({
                            'Token Name': token.name ?? 'N/A',
                            'Mint Address': token.mint ?? 'N/A',
                            Symbol: token.symbol ?? 'N/A',
                            'Trader Type': 'Seller',
                            'Trader Public Key': trader ?? 'N/A',
                            Amount: data?.amount ?? 'N/A',
                            Timestamp: data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'N/A',
                            'Is Favorite': favorites.has(token.mint) ? 'Yes' : 'No',
                        });
                    });
                }
            });

            if (traderDetailsData.length > 0) {
                const traderDetailsWorksheet = XLSX.utils.json_to_sheet(traderDetailsData);
                traderDetailsWorksheet['!cols'] = [
                    { wch: 20 }, // Token Name
                    { wch: 44 }, // Mint Address
                    { wch: 15 }, // Symbol
                    { wch: 25 }, // Trader Type
                    { wch: 44 }, // Trader Public Key
                    { wch: 18 }, // Amount
                    { wch: 20 }, // Timestamp
                    { wch: 12 }, // Is Favorite
                ];
                XLSX.utils.book_append_sheet(workbook, traderDetailsWorksheet, 'Trader Details');
            }

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `comprehensive_tokens_${activeTab}_${timestamp}.xlsx`;

            // Save file
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export data. Please try again.');
        }
    }, [tokensToShow, activeTab, favorites, exportStartDate]);

    // Export function to JSON
    const handleExportToJSON = useCallback(() => {
        if (tokensToShow.length === 0) {
            alert('No data to export.');
            return;
        }

        // Filter tokens based on selected start date and time
        let filteredTokens = tokensToShow;
        if (exportStartDate) {
            const startDate = new Date(exportStartDate).getTime();
            filteredTokens = tokensToShow.filter((token) => token.timestamp >= startDate);

            if (filteredTokens.length === 0) {
                alert('No tokens found for the selected date and time range.');
                return;
            }
        }

        try {
            // Prepare the export data structure
            const exportData = {
                exportInfo: {
                    timestamp: new Date().toISOString(),
                    activeTab: activeTab,
                    startDate: exportStartDate || null,
                    totalTokens: filteredTokens.length,
                    exportType: 'JSON',
                },
                tokens: filteredTokens.map((token) => ({
                    ...token,
                    isFavorite: favorites.has(token.mint),
                })),
            };

            // Convert to JSON string with pretty formatting
            const jsonString = JSON.stringify(exportData, null, 2);

            // Create and download the file
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `tokens_${activeTab}_${timestamp}.json`;

            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting to JSON:', error);
            alert('Failed to export data. Please try again.');
        }
    }, [tokensToShow, activeTab, favorites, exportStartDate]);

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

            {/* Export Section */}
            <div className='mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg'>
                <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
                    <div className='flex flex-col gap-2'>
                        <label htmlFor='exportStartDate' className='text-sm text-gray-300 font-medium'>
                            Export from Date & Time (Optional)
                        </label>
                        <div className='flex gap-2'>
                            <input
                                type='date'
                                id='exportStartDate'
                                value={exportStartDate.split('T')[0] || ''}
                                onChange={(e) => {
                                    const currentTime = exportStartDate.includes('T') ? exportStartDate.split('T')[1] : '00:00:00';
                                    setExportStartDate(`${e.target.value}T${currentTime}`);
                                }}
                                className='px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            />
                            <input
                                type='time'
                                step='1'
                                value={exportStartDate.includes('T') ? exportStartDate.split('T')[1] : '00:00:00'}
                                onChange={(e) => {
                                    const currentDate = exportStartDate.split('T')[0] || new Date().toISOString().split('T')[0];
                                    setExportStartDate(`${currentDate}T${e.target.value}`);
                                }}
                                className='px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            />
                        </div>
                    </div>
                    <div className='text-sm text-gray-400'>
                        {exportStartDate ? (
                            <span>
                                Will export tokens created from:{' '}
                                <span className='text-blue-400'>{new Date(exportStartDate).toLocaleString()}</span>
                            </span>
                        ) : (
                            <span>Will export all available tokens</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleExportToExcel}
                    disabled={tokensToShow.length === 0}
                    className='px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm hover:text-white cursor-pointer rounded-md transition-colors flex items-center gap-2'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                        />
                    </svg>
                    Export to Excel
                </button>
                <button
                    onClick={handleExportToJSON}
                    disabled={tokensToShow.length === 0}
                    className='px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm hover:text-white cursor-pointer rounded-md transition-colors flex items-center gap-2'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                        />
                    </svg>
                    Export to JSON
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
