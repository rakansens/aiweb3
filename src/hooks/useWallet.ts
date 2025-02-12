import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address: address,
  });

  const [ensName, setEnsName] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnsName = async () => {
      if (address && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        try {
          const name = await provider.lookupAddress(address);
          setEnsName(name);
        } catch (error) {
          console.error('Error fetching ENS name:', error);
        }
      }
    };

    fetchEnsName();
  }, [address]);

  const handleConnect = useCallback(async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connect]);

  const handleDisconnect = useCallback(() => {
    try {
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }, [disconnect]);

  return {
    address,
    ensName,
    isConnected,
    balance,
    connect: handleConnect,
    disconnect: handleDisconnect,
  };
};
