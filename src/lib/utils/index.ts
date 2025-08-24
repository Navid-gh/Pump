export async function fetchJsonWithFallback(urls: string[]) {
    for (const u of urls) {
        try {
            const r = await fetch(u, { cache: 'no-store' });
            if (!r.ok) continue;
            return await r.json();
        } catch {}
    }
    throw new Error('All IPFS gateways failed');
}
