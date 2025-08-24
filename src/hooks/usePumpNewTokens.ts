import { useEffect, useRef, useState } from 'react';
import type { PumpNewTokenEvent } from '@/types/services';
import { ipfsToHttp, LRU } from '@/lib/utils/ipfs';
import { fetchJsonWithFallback } from '@/lib/utils';

const metaCache = new LRU<string, any>(300);

export function usePumpNewTokens() {
    const [tokens, setTokens] = useState<PumpNewTokenEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const ws = new WebSocket('wss://pumpportal.fun/api/data');
        wsRef.current = ws;

        ws.onopen = () => {
            setConnected(true);
            ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
        };

        ws.onmessage = async (ev) => {
            let msg: any;
            try {
                msg = JSON.parse(ev.data);
            } catch {
                return;
            }

            // Expecting new token events matching your shape
            const e = msg as Partial<PumpNewTokenEvent>;
            if (!e || e.txType !== 'create' || !e.mint) return;

            // resolve image (from metadata at e.uri)
            let imageUrl: string | undefined;
            if (e.uri) {
                const cached = metaCache.get(e.uri);
                try {
                    const meta = cached ?? (await fetchJsonWithFallback(ipfsToHttp(e.uri)));
                    if (!cached) metaCache.set(e.uri, meta);

                    const rawImage = meta?.image ?? meta?.image_url ?? meta?.icon;
                    if (rawImage) {
                        imageUrl = ipfsToHttp(String(rawImage))[0]; // pick first gateway
                    }
                } catch {
                    // ignore meta failures
                }
            }

            const full: PumpNewTokenEvent = {
                signature: e.signature!,
                mint: e.mint!,
                traderPublicKey: e.traderPublicKey ?? '',
                txType: 'create',
                initialBuy: Number(e.initialBuy ?? 0),
                solAmount: Number(e.solAmount ?? 0),
                bondingCurveKey: e.bondingCurveKey ?? '',
                vTokensInBondingCurve: Number(e.vTokensInBondingCurve ?? 0),
                vSolInBondingCurve: Number(e.vSolInBondingCurve ?? 0),
                marketCapSol: Number(e.marketCapSol ?? 0),
                name: e.name ?? 'Unknown',
                symbol: e.symbol ?? '',
                uri: e.uri ?? '',
                pool: e.pool ?? '',
                timestamp: e.timestamp ?? Date.now(),
                image: imageUrl,
            };

            setTokens((prev) => [full, ...prev].slice(0, 200));
        };

        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);

        return () => ws.close();
    }, []);

    return { tokens, connected };
}
