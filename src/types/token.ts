export interface NewTokenData {
    signature: string;
    mint: string;
    marketCapSol: number;
    symbol: string;
    solAmount: number;
    name: string;
    txType: string;
    traderPublicKey?: string;
    vTokensInBondingCurve: number;
    vSolInBondingCurve: number;
    initialBuy?: number;
    uri: string;
    pool: string;
}

export interface TokenTradeData {
    signature: string;
    mint: string;
    txType: string;
    tokenAmount: number;
    solAmount: number;
    marketCapSol: number;
    vTokensInBondingCurve: number;
    vSolInBondingCurve: number;
    traderPublicKey?: string;

    // Custom fields
    timestamp: number;
}

export type Token = NewTokenData & {
    // Custom fields
    timestamp: number;
    lastTradeTime: number;
    marketCap: {
        max: {
            marketCapSol: number;
            timestamp: number;
        };
        min: {
            marketCapSol: number;
            timestamp: number;
        };
        curToInitial?: number;
        curToInitialPerMinute?: number;
        dMCdtPerMin?: number | null; // global slope
        d2MCdt2PerMin2?: number | null; // global acceleration
        lastThreePoints?: {
            mc0: number; // current
            mc1: number; // last
            mc2: number; // second-to-last
            t0: number;
            t1: number;
            t2: number;
        };
    };
    entryPoint?: {
        marketCapSol: number;
        timestamp: number;
    };
    mcMultiplier?: number;
    trades: {
        buy: TokenTradeData[];
        sell: TokenTradeData[];
        all: TokenTradeData[];
    };
    tpm?: {
        buy: number;
        sell: number;
        all: number;
    };
    volume?: {
        buy: number;
        sell: number;
        buyToSellRatio: number;
        diff: number;
    };
    traders: {
        higher1SolBuyers: Record<string, { amount: number; timestamp: number }>;
        higher1SolSellers: Record<string, { amount: number; timestamp: number }>;
        buyers: Record<string, { amount: number; timestamp: number }>;
        sellers: Record<string, { amount: number; timestamp: number }>;
    };

    image?: string;
    previous?: Token;
};
