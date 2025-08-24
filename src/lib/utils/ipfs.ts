const GATEWAYS = [
    (cid: string) => `https://ipfs.io/ipfs/${cid}`,
    (cid: string) => `https://cloudflare-ipfs.com/ipfs/${cid}`,
    (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`,
];

export function ipfsToHttp(u: string): string[] {
    if (!u) return [];
    if (u.startsWith('ipfs://')) {
        const cid = u.replace('ipfs://', '').replace(/^ipfs\//, '');
        return GATEWAYS.map((g) => g(cid));
    }
    if (/^https?:\/\//i.test(u)) return [u];
    // raw CID or /ipfs/<cid>
    const cid = u.replace(/^\/?ipfs\//, '');
    return GATEWAYS.map((g) => g(cid));
}

// Tiny LRU for JSON metadata + images
type Entry<T> = { v: T; t: number };
export class LRU<K, V> {
    private max: number;
    private m = new Map<K, Entry<V>>();
    constructor(max = 200) {
        this.max = max;
    }
    get(k: K) {
        const e = this.m.get(k);
        if (!e) return;
        e.t = Date.now();
        return e.v;
    }
    set(k: K, v: V) {
        this.m.set(k, { v, t: Date.now() });
        if (this.m.size > this.max) {
            const oldest = [...this.m.entries()].sort((a, b) => a[1].t - b[1].t)[0]?.[0];
            if (oldest !== undefined) this.m.delete(oldest);
        }
    }
}
