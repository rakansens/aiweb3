import type { AppProps } from 'next/app';
import { WagmiConfig, createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { createPublicClient, http } from 'viem';
import '../styles/globals.css';

const config = createConfig({
  autoConnect: false,
  publicClient: createPublicClient({
    chain: sepolia,
    transport: http('https://rpc.sepolia.org')
  }),
  connectors: [
    new MetaMaskConnector({
      chains: [sepolia],
      options: {
        shimDisconnect: true,
        UNSTABLE_shimOnConnectSelectAccount: true,
      },
    }),
  ],
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig config={config}>
      <Component {...pageProps} />
    </WagmiConfig>
  );
}
