import { useEffect, useRef, useState } from 'react';
import type { PumpNewTokenResponse } from '@/types/services';
import type { Token } from '@/types/token';
import { BACKEND_URL } from '@/lib/utils/constants';

// import { ipfsToHttp, LRU } from '@/lib/utils/ipfs';
// import { fetchJsonWithFallback } from '@/lib/utils';
// const metaCache = new LRU<string, any>(300);

export function usePumpNewTokens() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [enteredTokens, setEnteredTokens] = useState<Token[]>([]);
    const prevDataRef = useRef<{ tokens: Map<string, Token>; enteredTokens: Map<string, Token> }>({
        tokens: new Map(),
        enteredTokens: new Map(),
    });

    useEffect(() => {
        const backUrl = `${BACKEND_URL}/tokens`;

        const interval = setInterval(async () => {
            fetch(backUrl)
                .then((res) => res.json())
                .then(async (data: PumpNewTokenResponse) => {
                    const processTokens = async (tokenList: Token[], prevMap: Map<string, Token>): Promise<Token[]> => {
                        const tokensWithImages: Token[] = [];
                        for (const token of tokenList) {
                            let imageUrl: string | undefined = '';
                            // if (token.uri) {
                            //     const cached = metaCache.get(token.uri);
                            //     try {
                            //         const meta = cached ?? (await fetchJsonWithFallback(ipfsToHttp(token.uri)));
                            //         if (!cached) metaCache.set(token.uri, meta);
                            //         const rawImage = meta?.image ?? meta?.image_url ?? meta?.icon;
                            //         if (rawImage) imageUrl = ipfsToHttp(String(rawImage))[0];
                            //     } catch {}
                            // }
                            const prevToken = prevMap.get(token.mint);
                            tokensWithImages.push({ ...token, image: imageUrl, previous: prevToken });
                        }
                        return tokensWithImages;
                    };

                    const newActiveTokens = await processTokens(data.activeTokens, prevDataRef.current.tokens);
                    const newEnteredTokens = await processTokens(data.enteredTokens, prevDataRef.current.enteredTokens);

                    setTokens(newActiveTokens);
                    setEnteredTokens(newEnteredTokens);

                    prevDataRef.current = {
                        tokens: new Map(data.activeTokens.map((t) => [t.mint, t])),
                        enteredTokens: new Map(data.enteredTokens.map((t) => [t.mint, t])),
                    };
                });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return { tokens, enteredTokens };
}
