import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Token } from '@/types/token';
import { Metric, MetricChange } from './ui/Metric';
import { useFavorites } from '@/hooks/useFavorites';
import { formatTime, solToUsd, formatPercentage } from '@/lib/utils/format';
import { BACKEND_URL } from '@/lib/utils/constants';

export default function TokenCard({ t }: { t: Token }) {
    const [copied, setCopied] = useState(false);
    const { addFavorite, removeFavorite, isFavorite } = useFavorites();
    const isFav = isFavorite(t.mint);
    const timeSinceLastTrade = (Date.now() - t?.lastTradeTime) / 1000;
    const ageInSeconds = (Date.now() - t?.timestamp) / 1000;
    const [isDeleted, setIsDeleted] = useState(false);

    const tradesLength = t?.trades?.all?.length ?? 0;
    let currentMC = t.marketCapSol;
    if (tradesLength > 0) {
        currentMC = t?.trades?.all?.[tradesLength - 1]?.marketCapSol ?? 0;
    }

    const copy = async (val: string) => {
        try {
            await navigator.clipboard.writeText(val);
            setCopied(true);
            setTimeout(() => setCopied(false), 900);
        } catch {}
    };

    const handleFavoriteClick = () => {
        if (isFav) removeFavorite(t.mint);
        else addFavorite(t.mint);
    };

    const handleDelete = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/tokens/${t.mint}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error('Failed to delete token');
            }
            // Optimistically hide the card
            setIsDeleted(true);
        } catch (error) {
            console.error('Error deleting token:', error);
            alert('Failed to delete token.');
        }
    };

    if (isDeleted) return null;

    const lastTrade = t?.trades?.all?.[t?.trades?.all?.length - 1];

    return (
        <div className='rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 shadow-lg backdrop-blur text-[12px]'>
            <div className='flex items-center gap-3'>
                {t.image ? (
                    <img src={t.image} alt={t.name} className='w-10 h-10 rounded-xl object-cover' />
                ) : (
                    <div className='size-10 rounded-xl bg-white/10 flex items-center justify-center text-xs font-semibold'>
                        {(t?.symbol || t?.name)?.slice(0, 3).toUpperCase() ?? ''}
                    </div>
                )}
                <div className='min-w-0'>
                    <Link to={`/token/${t.mint}`} className='text-sm font-semibold truncate hover:underline flex items-center gap-1'>
                        {t?.name}
                        {t?.timestamp && (
                            <span className='text-xs text-white/60'> (Created: {formatTime((Date.now() - t?.timestamp) / 1000)})</span>
                        )}
                        {t.entryPoint && (
                            <span className='text-xs text-white/60'>
                                {' '}
                                (Entered: {formatTime((Date.now() - t?.entryPoint?.timestamp) / 1000)})
                            </span>
                        )}
                        {<span className='text-xs text-white/60'>Updated: {formatTime(timeSinceLastTrade)}</span>}
                    </Link>
                    <div className='text-xs text-white/60 truncate'>${t?.symbol}</div>
                </div>
                <button onClick={handleFavoriteClick} className='text-2xl'>
                    {isFav ? '⭐️' : '✩'}
                </button>
            </div>

            <div className='mt-3 grid grid-cols-4 gap-2 text-white/80'>
                <Metric
                    label='Initial MC'
                    value={solToUsd(t?.marketCapSol ?? 0)}
                    previousValue={t?.previous ? solToUsd(t?.previous?.marketCapSol ?? 0) : undefined}
                    prefix='$'
                />

                <Metric
                    label='MCur'
                    value={solToUsd(currentMC)}
                    previousValue={t?.previous ? solToUsd(t?.previous?.marketCapSol ?? 0) : undefined}
                    time={lastTrade?.timestamp}
                    prefix='$'
                />
                <Metric
                    label='MCmax'
                    value={solToUsd(t?.marketCap?.max?.marketCapSol ?? 0)}
                    previousValue={t?.previous ? solToUsd(t?.previous?.marketCap?.max?.marketCapSol ?? 0) : undefined}
                    time={t?.marketCap?.max?.timestamp}
                    prefix='$'
                />
                <Metric
                    label='MCmin'
                    value={solToUsd(t?.marketCap?.min?.marketCapSol ?? 0)}
                    previousValue={t?.previous ? solToUsd(t?.previous?.marketCap?.min?.marketCapSol ?? 0) : undefined}
                    time={t?.marketCap?.min?.timestamp}
                    prefix='$'
                />
                <Metric label='MC/min' value={t?.marketCap?.curToInitialPerMinute?.toFixed(2) ?? 'N/A'} />
                {t?.marketCap?.dMCdtPerMin ? <MetricChange value={t?.marketCap?.dMCdtPerMin} label='dMC/min' /> : <div />}

                <Metric
                    label='Liq Bond Cur'
                    value={t?.vSolInBondingCurve ?? 0}
                    previousValue={t?.previous?.vSolInBondingCurve}
                    prefix='SOL'
                />
                <Metric label='Age' value={formatTime(ageInSeconds)} format={false} />
                <Metric label='Last' value={formatTime(timeSinceLastTrade)} format={false} />
                {t.marketCap.d2MCdt2PerMin2 ? (
                    <Metric label='MC Accel' value={t.marketCap.d2MCdt2PerMin2.toFixed(2)} format={false} />
                ) : (
                    <div />
                )}

                <Metric label='Buy Vol' value={t?.volume?.buy ?? 0} previousValue={t?.previous?.volume?.buy} prefix='SOL' />
                <Metric label='Sell Vol' value={t?.volume?.sell ?? 0} previousValue={t?.previous?.volume?.sell} prefix='SOL' />
                <Metric label='B/S Ratio' value={t?.volume?.buyToSellRatio ?? 0} previousValue={t?.previous?.volume?.buyToSellRatio} />
                <Metric label='Vol Diff' value={t?.volume?.diff ?? 0} previousValue={t?.previous?.volume?.diff} prefix='SOL' />

                <Metric label='Buys' value={t?.trades?.buy?.length ?? 0} previousValue={t?.previous?.trades?.buy?.length} format={false} />
                <Metric
                    label='Sells'
                    value={t?.trades?.sell?.length ?? 0}
                    previousValue={t?.previous?.trades?.sell?.length}
                    format={false}
                />
                <Metric label='Buy TPM' value={t?.tpm?.buy ?? 0} previousValue={t?.previous?.tpm?.buy} format={false} />
                <Metric label='Sell TPM' value={t?.tpm?.sell ?? 0} previousValue={t?.previous?.tpm?.sell} format={false} />
                <Metric
                    label='U. Buyers'
                    value={Object.keys(t?.traders?.buyers ?? {}).length}
                    previousValue={Object.keys(t?.previous?.traders?.buyers ?? {}).length}
                    format={false}
                />
                <Metric
                    label='U. Sellers'
                    value={Object.keys(t?.traders?.sellers ?? {}).length}
                    previousValue={Object.keys(t?.previous?.traders?.sellers ?? {}).length}
                    format={false}
                />
                <Metric
                    label='U. Buy Whales'
                    value={Object.keys(t?.traders?.higher1SolBuyers ?? {}).length}
                    previousValue={Object.keys(t?.previous?.traders?.higher1SolBuyers ?? {}).length}
                    format={false}
                />
                <Metric
                    label='U. Sell Whales'
                    value={Object.keys(t?.traders?.higher1SolSellers ?? {}).length}
                    previousValue={Object.keys(t?.previous?.traders?.higher1SolSellers ?? {}).length}
                    format={false}
                />
            </div>

            {t.entryPoint && (
                <div className='mt-3 border-t border-blue-400/50 pt-3 grid grid-cols-4 gap-2 text-white/80'>
                    <Metric
                        label='Entry MC'
                        value={solToUsd(t?.entryPoint?.marketCapSol ?? 0)}
                        prefix='$'
                        time={t?.entryPoint?.timestamp}
                    />
                    <Metric
                        label='Profit'
                        value={formatPercentage(t?.marketCap?.max?.marketCapSol ?? 0, t?.entryPoint?.marketCapSol ?? 0)}
                        format={false}
                    />
                    <Metric label='Time' value={formatTime((Date.now() - t?.entryPoint?.timestamp) / 1000)} format={false} />
                </div>
            )}

            <div className='mt-3 flex gap-2'>
                <button
                    className='px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/10'
                    onClick={() => copy(t?.mint ?? '')}>
                    {copied ? 'Copied ✅' : 'Copy Mint'}
                </button>
                <a
                    className='px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 border border-white/10'
                    href={`https://pump.fun/${t?.mint}`}
                    target='_blank'
                    rel='noreferrer'>
                    Pump.fun ↗
                </a>
                <a
                    className='px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15 border border-white/10'
                    href={`https://solscan.io/token/${t?.mint}`}
                    target='_blank'
                    rel='noreferrer'>
                    Solscan ↗
                </a>
                <button
                    onClick={handleDelete}
                    className='px-3 py-1.5 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'>
                    Delete
                </button>
            </div>
        </div>
    );
}
