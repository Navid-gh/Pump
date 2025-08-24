import express, { Express, Request, Response } from 'express';
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import notFoundMiddleware from './middlewares/notFound.js';
import errorMiddleware from './middlewares/error.js';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';

const app: Express = express();
const server = http.createServer(app);
// Create WebSocket server for clients
// const clientsWs = new WebSocketServer({ server });
const port = process.env.PORT || 4000;
// Add file path constant
const ENTERED_TOKENS_FILE = path.join(process.cwd(), 'entered_tokens.json');

interface NewTokenData {
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

interface TokenTradeData {
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

type Token = NewTokenData & {
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
};

// Global config
const WS_CONFIG = {
    url: 'wss://pumpportal.fun/api/data',

    minMarketCap: 33,
    minEntryMarketCap: 40,
    minEntryTradesCount: 10,

    tokens: [] as Token[],
    enteredTokens: [] as Token[],

    newTokenTimeout: 60000, // 1 minute
    tradeCheckInterval: 60000, // 1 minute

    listenNewToken: true,
    listenTokenTrade: true,
};

function responseFormat() {
    return {
        status: 'running',
        activeTokens: WS_CONFIG.tokens.map(serializeToken),
        enteredTokens: WS_CONFIG.enteredTokens.map(serializeToken),
        config: {
            minMarketCap: WS_CONFIG.minMarketCap,
            minEntryMarketCap: WS_CONFIG.minEntryMarketCap,
            minEntryTradesCount: WS_CONFIG.minEntryTradesCount,
            newTokenTimeout: WS_CONFIG.newTokenTimeout,
            tradeCheckInterval: WS_CONFIG.tradeCheckInterval,
            listenNewToken: WS_CONFIG.listenNewToken,
            listenTokenTrade: WS_CONFIG.listenTokenTrade,
        },
    };
}

// Function to save entered tokens
async function saveEnteredTokens() {
    try {
        const serializedTokens = WS_CONFIG.enteredTokens.map(serializeToken);

        await fs.writeFile(ENTERED_TOKENS_FILE, JSON.stringify(serializedTokens, null, 2));
        console.log('Saved entered tokens to file');
    } catch (error) {
        console.error('Error saving entered tokens:', error);
    }
}

// Function to load entered tokens on init
async function loadEnteredTokens() {
    try {
        const data = await fs.readFile(ENTERED_TOKENS_FILE, 'utf-8');
        const savedTokens = JSON.parse(data);
        console.log(`Loaded ${savedTokens.length} entered tokens from file`);
        return savedTokens;
    } catch (error) {
        console.log('No previous entered tokens file found');
        return [];
    }
}

const INF = 1e9;
function safeRatio(a: number, b: number): number {
    if (b > 0) return a / b;
    if (a > 0) return INF;
    return 0; // neither buy nor sell -> neutral
}

function getTotalVolume(token: Token) {
    const buyVolume = token.trades.buy.reduce((sum, trade) => sum + trade.solAmount, 0);
    const sellVolume = token.trades.sell.reduce((sum, trade) => sum + trade.solAmount, 0);
    const buyToSellRatio = safeRatio(buyVolume, sellVolume);
    token.volume = {
        buy: buyVolume,
        sell: sellVolume,
        buyToSellRatio,
        diff: buyVolume - sellVolume,
    };
}

// Function to broadcast updates to all connected clients
function broadcastToClients() {
    // clientsWs.clients.forEach((client) => {
    //     if (client.readyState === WebSocket.OPEN) {
    //         client.send(JSON.stringify(responseFormat()));
    //     }
    // });
}

function memoryUsage() {
    const mem = process.memoryUsage();
    console.log(
        `========== Memory usage: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB, heapTotal: ${(mem.heapTotal / 1024 / 1024).toFixed(
            2
        )} MB ==========`
    );
}

setInterval(memoryUsage, 10000);

const checkForEntryPoint = (token: Token, currentTrade: TokenTradeData) => {
    if (token.trades.all.length >= WS_CONFIG.minEntryTradesCount) {
        if (currentTrade.marketCapSol >= WS_CONFIG.minEntryMarketCap) {
            token.entryPoint = {
                marketCapSol: currentTrade.marketCapSol,
                timestamp: Date.now(),
            };
            WS_CONFIG.enteredTokens.push(token);
        }
    }
};

const calculateTpm = (token: Token) => {
    // Calculate trades per minute (TPM) for buy, sell, and all trades
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;

    const buyTradesLastMinute = token.trades.buy.filter((trade) => trade.timestamp >= oneMinuteAgo);
    const sellTradesLastMinute = token.trades.sell.filter((trade) => trade.timestamp >= oneMinuteAgo);

    const buyTpm = buyTradesLastMinute.length;
    const sellTpm = sellTradesLastMinute.length;

    token.tpm = {
        buy: buyTpm,
        sell: sellTpm,
        all: buyTpm + sellTpm,
    };
};

const calculateMarketCapMetrics = (token: Token, latestTrade: TokenTradeData) => {
    const maxMarketCap = token.marketCap.max;
    const minMarketCap = token.marketCap.min;
    if (latestTrade.marketCapSol > maxMarketCap.marketCapSol) {
        maxMarketCap.marketCapSol = latestTrade.marketCapSol;
        maxMarketCap.timestamp = Date.now();
    }
    if (latestTrade.marketCapSol < minMarketCap.marketCapSol) {
        minMarketCap.marketCapSol = latestTrade.marketCapSol;
        minMarketCap.timestamp = Date.now();
    }
    const now = Date.now();
    const curToInitial = safeRatio(latestTrade.marketCapSol, token.marketCapSol ?? 0);
    const elapsedMinutesSinceCreation = (now - token.timestamp) / (60 * 1000);
    const curToInitialPerMinute = safeRatio(latestTrade.marketCapSol - token.marketCapSol, elapsedMinutesSinceCreation);

    const mc0 = latestTrade.marketCapSol;
    const t0 = now;

    // Get previous points
    const len = token.trades.all.length;
    const lastTrade = token.trades.all[len - 1];
    const secondLastTrade = token.trades.all[len - 2];

    const mc1 = lastTrade?.marketCapSol ?? mc0;
    const mc2 = secondLastTrade?.marketCapSol ?? mc1;

    const t1 = lastTrade?.timestamp ?? t0;
    const t2 = secondLastTrade?.timestamp ?? t1;

    // Update the metrics in the existing marketCap object
    const lastThreePoints = {
        mc0,
        mc1,
        mc2,
        t0,
        t1,
        t2,
    };

    // Update existing metrics
    const dMCdtPerMin = t1 === t0 ? 0 : (mc1 - mc0) / ((t1 - t0) / (60 * 1000));
    const d2MCdt2PerMin2 = t2 === t0 ? 0 : (mc2 - mc0) / ((t2 - t0) / (60 * 1000));

    token.marketCap = {
        max: maxMarketCap,
        min: minMarketCap,
        curToInitial,
        curToInitialPerMinute,
        dMCdtPerMin,
        d2MCdt2PerMin2,
        lastThreePoints,
    };
};

// WebSocket client setup for pumpportal
let ws: WebSocket;
let tradeCheckInterval: NodeJS.Timeout;

function subscribeToNewToken() {
    if (!WS_CONFIG.listenNewToken) return;
    const payload = {
        method: 'subscribeNewToken',
    };
    ws.send(JSON.stringify(payload));
    console.log('Subscribed to new tokens');
    // // Unsubscribe after 1 minute
    // setTimeout(() => {
    //     ws.send(JSON.stringify({ method: 'unsubscribeNewToken' }));
    //     console.log('Unsubscribed from new tokens');
    //     subscribeToTokenTrades();
    // }, WS_CONFIG.newTokenTimeout);
}

function unsubscribeFromNewToken() {
    if (!WS_CONFIG.listenNewToken) return;
    ws.send(JSON.stringify({ method: 'unsubscribeNewToken' }));
    console.log('Unsubscribed from new tokens');
}

function subscribeToTokenTrades() {
    if (!WS_CONFIG.listenTokenTrade) return;
    if (WS_CONFIG.tokens.length === 0) {
        console.log('No tokens to watch');
        subscribeToNewToken();
        return;
    }

    const payload = {
        method: 'subscribeTokenTrade',
        keys: WS_CONFIG.tokens.map((token) => token.mint),
    };
    ws.send(JSON.stringify(payload));
    console.log('Subscribed to token trades:', WS_CONFIG.tokens.map((t) => t.name).join(', '));
    // Check trades periodically
}

function unsubscribeFromTokenTrades() {
    if (!WS_CONFIG.listenTokenTrade) return;
    ws.send(JSON.stringify({ method: 'unsubscribeTokenTrade' }));
    console.log('Unsubscribed from token trades');
}

async function checkAndCleanTokens() {
    const now = Date.now();
    const oldTokens = [...WS_CONFIG.tokens];
    WS_CONFIG.tokens = WS_CONFIG.tokens.filter((token) => {
        const timeSinceLastTrade = now - token.lastTradeTime;
        return timeSinceLastTrade <= WS_CONFIG.tradeCheckInterval;
    });

    if (WS_CONFIG.tokens.length !== oldTokens.length) {
        const removedTokens = oldTokens.filter((t) => !WS_CONFIG.tokens.includes(t));
        console.log('Removed inactive tokens:', removedTokens.map((t) => t.name).join(', '));

        // Check if the removed tokens are in the enteredTokens
        const removedEnteredTokens = removedTokens.filter((t) => t?.entryPoint?.marketCapSol);
        if (removedEnteredTokens.length > 0) {
            await saveEnteredTokens();
        }

        // Broadcast tokens update
        broadcastToClients();

        // Resubscribe with updated token list
        subscribeToTokenTrades();
    }
}

async function main() {
    const enteredTokens = await loadEnteredTokens();
    WS_CONFIG.enteredTokens = enteredTokens;
    WS_CONFIG.tokens = [];
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
    ws = new WebSocket(WS_CONFIG.url);
    ws.on('open', function open() {
        console.log('Connected to WebSocket server');
        subscribeToNewToken();
        if (!tradeCheckInterval) {
            tradeCheckInterval = setInterval(checkAndCleanTokens, WS_CONFIG.tradeCheckInterval);
        }
    });

    ws.on('message', function message(data) {
        const parsedData: NewTokenData | TokenTradeData = JSON.parse(data.toString());
        if (parsedData?.txType === 'create') {
            const tokenData = parsedData as NewTokenData;
            if (tokenData.marketCapSol >= WS_CONFIG.minMarketCap) {
                const newToken = {
                    ...tokenData,
                    timestamp: Date.now(),
                    lastTradeTime: Date.now(),
                    trades: {
                        buy: [],
                        sell: [],
                        all: [],
                    },
                    marketCap: {
                        max: {
                            marketCapSol: tokenData.marketCapSol,
                            timestamp: Date.now(),
                        },
                        min: {
                            marketCapSol: tokenData.marketCapSol,
                            timestamp: Date.now(),
                        },
                    },
                    mcMultiplier: 1,
                    traders: {
                        higher1SolBuyers: {} as Record<string, { amount: number; timestamp: number }>,
                        higher1SolSellers: {} as Record<string, { amount: number; timestamp: number }>,
                        buyers: {} as Record<string, { amount: number; timestamp: number }>,
                        sellers: {} as Record<string, { amount: number; timestamp: number }>,
                    },
                };
                WS_CONFIG.tokens.push(newToken);
                console.log(`Added new token: ${tokenData.name} (${tokenData.marketCapSol} SOL) at ${new Date(Date.now()).toISOString()}`);

                // Broadcast new token
                broadcastToClients();

                subscribeToTokenTrades();
            }
        }

        if (parsedData?.txType === 'sell' || parsedData?.txType === 'buy') {
            const tradeData = parsedData as TokenTradeData;
            const token = WS_CONFIG.tokens.find((t) => t.mint === tradeData.mint);
            if (token) {
                // Check if the token has entered the entry point
                const hasEntered = !!token.entryPoint;
                if (!hasEntered) {
                    checkForEntryPoint(token, tradeData);
                }

                // Update the market cap metrics
                calculateMarketCapMetrics(token, tradeData);

                // Update the trades
                token.lastTradeTime = Date.now();
                const trade = {
                    ...tradeData,
                    timestamp: Date.now(),
                };

                if (tradeData.txType === 'buy') {
                    token.trades.buy.push(trade);
                    const traderKey = trade.traderPublicKey ?? '';
                    const buyer = token.traders.buyers[traderKey];
                    if (buyer) {
                        buyer.amount += trade.solAmount;
                        buyer.timestamp = Date.now();
                    } else {
                        token.traders.buyers[traderKey] = { amount: trade.solAmount, timestamp: Date.now() };
                    }
                    if (trade.solAmount > 1) {
                        const highBuyer = token.traders.higher1SolBuyers[traderKey];
                        if (highBuyer) {
                            highBuyer.amount += trade.solAmount;
                            highBuyer.timestamp = Date.now();
                        } else {
                            token.traders.higher1SolBuyers[traderKey] = { amount: trade.solAmount, timestamp: Date.now() };
                        }
                    }
                } else {
                    token.trades.sell.push(trade);
                    const traderKey = trade.traderPublicKey ?? '';
                    const seller = token.traders.sellers[traderKey];
                    if (seller) {
                        seller.amount += trade.solAmount;
                        seller.timestamp = Date.now();
                    } else {
                        token.traders.sellers[traderKey] = { amount: trade.solAmount, timestamp: Date.now() };
                    }
                    if (trade.solAmount > 1) {
                        const highSeller = token.traders.higher1SolSellers[traderKey];
                        if (highSeller) {
                            highSeller.amount += trade.solAmount;
                            highSeller.timestamp = Date.now();
                        } else {
                            token.traders.higher1SolSellers[traderKey] = { amount: trade.solAmount, timestamp: Date.now() };
                        }
                    }
                }
                token.trades.all.push(trade);

                // Calculate mcMultiplier
                token.mcMultiplier = safeRatio(tradeData.marketCapSol, token.marketCapSol);

                // Calculate tpm
                calculateTpm(token);

                // Calculate volume
                getTotalVolume(token);

                // Logging
                const tradeType = parsedData.txType === 'buy' ? '🟢 BUY' : '🔴 SELL';
                const timeStr = new Date(Date.now()).toLocaleTimeString();
                const marketCapStr = tradeData.marketCapSol ? `${tradeData.marketCapSol} SOL` : 'N/A';
                console.log(`[${timeStr}] ${tradeType} | ${token.name} (${token.mint})\n` + `   Market Cap: ${marketCapStr}`);

                // Broadcast trade
                broadcastToClients();
            }
        }
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
    });

    ws.on('close', function close() {
        console.log('Disconnected from WebSocket server');
        main();
        clearInterval(tradeCheckInterval);
    });
}

function serializeToken(token: Token) {
    return {
        ...token,
        traders: {
            higher1SolBuyers: token.traders.higher1SolBuyers,
            higher1SolSellers: token.traders.higher1SolSellers,
            buyers: token.traders.buyers,
            sellers: token.traders.sellers,
        },
    };
}

// Express setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Add no-cache middleware
app.use((req: Request, res: Response, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
    });
    next();
});

// // WebSocket server for clients
// clientsWs.on('connection', (ws: WebSocket) => {
//     console.log('Client connected');

//     // Send initial state
//     ws.send(JSON.stringify(responseFormat()));

//     ws.on('close', () => {
//         console.log('Client disconnected');
//     });
// });

app.get('/tokens', (req: Request, res: Response) => {
    res.json(responseFormat());
});

app.get('/tokens/filter', (req: Request, res: Response) => {
    res.json(responseFormat().config);
});

app.post('/tokens/filter', (req: Request, res: Response) => {
    const { minMarketCap, minEntryMarketCap, minEntryTradesCount, newTokenTimeout, tradeCheckInterval, listenNewToken, listenTokenTrade } =
        req.body;
    WS_CONFIG.minMarketCap = minMarketCap;
    WS_CONFIG.minEntryMarketCap = minEntryMarketCap;
    WS_CONFIG.minEntryTradesCount = minEntryTradesCount;
    WS_CONFIG.newTokenTimeout = newTokenTimeout;
    WS_CONFIG.tradeCheckInterval = tradeCheckInterval;
    WS_CONFIG.listenNewToken = listenNewToken;
    WS_CONFIG.listenTokenTrade = listenTokenTrade;

    if (!listenNewToken) {
        unsubscribeFromNewToken();
    } else {
        subscribeToNewToken();
    }
    if (!listenTokenTrade) {
        unsubscribeFromTokenTrades();
    } else {
        subscribeToTokenTrades();
    }

    res.json({ status: 'success' });
});

app.delete('/tokens', (req: Request, res: Response) => {
    const { mints } = req.body;
    WS_CONFIG.tokens = WS_CONFIG.tokens.filter((t) => !mints.includes(t.mint));
    WS_CONFIG.enteredTokens = WS_CONFIG.enteredTokens.filter((t) => !mints.includes(t.mint));
    subscribeToTokenTrades();
    broadcastToClients();
    res.json({ status: 'success' });
});

app.post('/restart', async (req: Request, res: Response) => {
    await saveEnteredTokens();
    main().catch((err) => {
        console.error('Error starting server:', err);
        process.exit(1);
    });
    res.json({ status: 'success' });
});

app.get('/healthz', (_, res) =>
    res.json({
        ok: true,
        ts: Date.now(),
    })
);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Use server.listen instead of app.listen
server.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
    console.log(`WebSocket server is running on ws://localhost:${port}`);
});

main().catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
});

// save on exit
process.on('exit', async () => {
    await saveEnteredTokens();
});
