import Moralis from 'moralis';

async function main() {
  const apiKey = process.env.MORALIS_API_KEY;
  const publicUrl = process.env.PUBLIC_BASE_URL;
  if (!apiKey || !publicUrl) {
    console.error('Missing MORALIS_API_KEY or PUBLIC_BASE_URL');
    process.exit(1);
  }

  await Moralis.start({ apiKey });

  const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/webhooks/moralis`;

  const abi = [{
    anonymous: false,
    inputs: [
      { indexed: true, name: 'token0', type: 'address' },
      { indexed: true, name: 'token1', type: 'address' },
      { indexed: false, name: 'pair', type: 'address' },
      { indexed: false, name: '', type: 'uint256' }
    ],
    name: 'PairCreated',
    type: 'event'
  }];

  const stream = await Moralis.Streams.add({
    chains: ['0x38'],
    description: 'PancakeSwap PairCreated on BSC',
    tag: 'pcs-paircreated',
    webhookUrl,
    includeContractLogs: true,
    abi,
    topic0: ['PairCreated(address,address,address,uint256)'],
    allAddresses: false,
  });

  // PancakeSwap V2 Factory
  const PCS_FACTORY = '0xca143ce32fe78f1f7019d7d551a6402fc5350c73';
  await Moralis.Streams.addAddress({ id: (stream as any).raw.id, address: PCS_FACTORY });

  console.log('✅ Stream created:', (stream as any).raw.id);
  console.log('➡️  Webhook URL:', webhookUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});






