'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { AIWallet } from '../lib/AIWallet';

export type WalletState = {
  address: string | null;
  balance: string | null;
  dailyLimit: string | null;
  dailySpent: string | null;
  isLocked: boolean;
  isInitialized: boolean;
};

const INITIAL_STATE: WalletState = {
  address: null,
  balance: null,
  dailyLimit: null,
  dailySpent: null,
  isLocked: false,
  isInitialized: false,
};

export const useAIWallet = () => {
  const [wallet, setWallet] = useState<AIWallet | null>(null);
  const [state, setState] = useState<WalletState>(INITIAL_STATE);
  const mountedRef = useRef(true);

  const refreshState = useCallback(async () => {
    if (!wallet || !mountedRef.current) return;

    try {
      const [balance, dailyLimit, dailySpent, isLocked] = await Promise.all([
        wallet.getBalance(),
        wallet.getDailyLimit(),
        wallet.getDailySpent(),
        wallet.isLocked()
      ]);

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          balance,
          dailyLimit,
          dailySpent,
          isLocked,
        }));
      }
    } catch (error) {
      console.error('Failed to refresh wallet state:', error);
    }
  }, [wallet]);

  const executeTransaction = useCallback(async (to: string, value: string) => {
    if (!wallet) throw new Error('ウォレットが初期化されていません');
    const tx = await wallet.executeTransaction(to, value);
    await tx.wait();
    await refreshState();
    return tx;
  }, [wallet, refreshState]);

  const toggleLock = useCallback(async () => {
    if (!wallet) throw new Error('ウォレットが初期化されていません');
    const tx = await wallet.toggleLock();
    await tx.wait();
    await refreshState();
    return tx;
  }, [wallet, refreshState]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      setState(prev => ({ ...prev, isInitialized: false }));
      return;
    }

    const initializeWallet = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
        );

        // ネットワーク接続テスト
        try {
          const network = await provider.getNetwork();
          if (network.chainId !== 11155111) {
            throw new Error('Sepoliaネットワークに接続できません');
          }
        } catch (networkError) {
          console.error('Network connection error:', networkError);
          if (mountedRef.current) {
            setState(prev => ({ ...prev, isInitialized: false }));
          }
          return;
        }

        // ローカルストレージからウォレット情報を取得
        const storedWalletData = localStorage.getItem('aiWallet');
        let aiWallet: AIWallet;

        if (storedWalletData) {
          const { privateKey, contractAddress } = JSON.parse(storedWalletData);
          aiWallet = new AIWallet(privateKey, contractAddress, provider);
        } else {
          aiWallet = await AIWallet.create();
          localStorage.setItem('aiWallet', JSON.stringify({
            privateKey: aiWallet.getPrivateKey(),
            contractAddress: aiWallet.getAddress()
          }));
        }

        if (mountedRef.current) {
          setWallet(aiWallet);
          setState(prev => ({
            ...prev,
            address: aiWallet.getAddress(),
            isInitialized: true,
          }));
        }
      } catch (error) {
        console.error('Failed to initialize wallet:', error);
        if (mountedRef.current) {
          setState(prev => ({ ...prev, isInitialized: false }));
        }
      }
    };

    initializeWallet();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!wallet || !mountedRef.current) return;

    refreshState();
    const interval = setInterval(refreshState, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [wallet, refreshState]);

  return {
    ...state,
    executeTransaction,
    toggleLock,
    refreshState,
  };
};
