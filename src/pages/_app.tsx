import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { alchemyProvider } from 'wagmi/providers/alchemy';
import { publicProvider } from 'wagmi/providers/public';

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia],
  [
    alchemyProvider({ apiKey: 'YOUR-ALCHEMY-API-KEY' }), // AlchemyのAPIキーを設定
    publicProvider() // フォールバックとしてpublicProviderを使用
  ]
);

const config = createConfig({
  autoConnect: true,
  connectors: [new MetaMaskConnector({ chains })],
  publicClient,
  webSocketPublicClient,
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiConfig config={config}>
      <Component {...pageProps} />
    </WagmiConfig>
  );
}
