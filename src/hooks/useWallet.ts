import { useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useNetwork } from 'wagmi';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import type { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export const useWallet = () => {
  const { address, isConnected } = useAccount();
  const { connect: wagmiConnect, isLoading } = useConnect({
    connector: new MetaMaskConnector(),
  });
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });
  const { chain } = useNetwork();
  const [ensName, setEnsName] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('ブラウザ環境でのみ実行可能です');
      }

      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error('MetaMaskがインストールされていません');
      }

      // MetaMaskが利用可能か確認
      if (!ethereum.isMetaMask) {
        throw new Error('MetaMaskを使用してください');
      }

      // Sepoliaネットワークに切り替え
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } else {
          throw switchError;
        }
      }

      // 接続を試行
      await wagmiConnect();

    } catch (error) {
      console.error('Wallet connection error:', error);
      if (error instanceof Error) {
        throw new Error(`ウォレット接続エラー: ${error.message}`);
      }
      throw new Error('ウォレットの接続に失敗しました');
    }
  }, [wagmiConnect]);

  // ネットワーク変更の監視
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on('chainChanged', handleChainChanged);
    return () => {
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // アカウント変更の監視
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = () => {
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  return {
    address,
    ensName,
    isConnected,
    isLoading,
    balance,
    chain,
    connect,
    disconnect: () => disconnect(),
  };
};
