import fetch from 'node-fetch';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export class HeliusService {
    // Get token metadata
    async getTokenMetadata(mintAddress: string) {
        try {
            const response = await fetch(HELIUS_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'helius-token-metadata',
                    method: 'getAsset',
                    params: { id: mintAddress },
                }),
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Helius metadata fetch error:', error);
            return null;
        }
    }

    // Get token holders count
    async getTokenHolders(mintAddress: string) {
        try {
            const response = await fetch(
                `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mintAccounts: [mintAddress],
                    }),
                }
            );

            if (!response.ok) return null;
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error('Helius holders fetch error:', error);
            return null;
        }
    }

    // Get enhanced transaction data
    async getTransaction(signature: string) {
        try {
            const response = await fetch(
                `https://api.helius.xyz/v0/transactions/?api-key=${HELIUS_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transactions: [signature],
                    }),
                }
            );

            if (!response.ok) return null;
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error('Helius transaction fetch error:', error);
            return null;
        }
    }

    // Get wallet token balances
    async getWalletTokens(walletAddress: string) {
        try {
            const response = await fetch(HELIUS_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 'helius-wallet-tokens',
                    method: 'getAssetsByOwner',
                    params: {
                        ownerAddress: walletAddress,
                        page: 1,
                        limit: 1000,
                    },
                }),
            });

            if (!response.ok) return null;
            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Helius wallet tokens fetch error:', error);
            return null;
        }
    }
}

export const heliusService = new HeliusService();
