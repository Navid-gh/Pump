import type { Token } from './token';

export type PumpNewTokenResponse = {
    activeTokens: Token[];
    enteredTokens: Token[];
    status: string;
    config: {
        minMarketCap: number;
        minEntryMarketCap: number;
        minEntryTradesCount: number;
        newTokenTimeout: number;
        tradeCheckInterval: number;
        listenNewToken: boolean;
        listenTokenTrade: boolean;
    };
};
