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
  isCreating: boolean;
  error: string | null;
  securityInfo: {
    privateKey: string | null;
    mnemonic: string | null;
    contractAddress: string | null;
  };
  alchemyData: {
    transactions: any[];
    tokenBalances: any[];
    latestBlock: any;
    isLoading: boolean;
  };
  estimatedGas: string | null;
  processingStep: string | null;
};

const INITIAL_STATE: WalletState = {
  address: null,
  balance: null,
  dailyLimit: null,
  dailySpent: null,
  isLocked: false,
  isInitialized: false,
  isCreating: false,
  error: null,
  securityInfo: {
    privateKey: null,
    mnemonic: null,
    contractAddress: null,
  },
  alchemyData: {
    transactions: [],
    tokenBalances: [],
    latestBlock: null,
    isLoading: false
  },
  estimatedGas: null,
  processingStep: null
};

// トランザクション型の定義
export type Transaction = {
  hash: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
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

  const createWallet = useCallback(async () => {
    if (state.isInitialized) {
      throw new Error('ウォレットは既に初期化されています');
    }

    setState(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (!apiKey) {
        throw new Error('Alchemy APIキーが設定されていません');
      }

      const provider = new ethers.providers.JsonRpcProvider(
        `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
      );

      // ネットワーク確認
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        throw new Error('Sepoliaネットワークに接続できません');
      }

      // ウォレット作成
      const aiWallet = await AIWallet.create();
      const randomWallet = ethers.Wallet.createRandom();

      // 状態を更新
      if (mountedRef.current) {
        setWallet(aiWallet);
        setState(prev => ({
          ...prev,
          address: aiWallet.getAddress(),
          isInitialized: true,
          isCreating: false,
          securityInfo: {
            privateKey: aiWallet.getPrivateKey(),
            mnemonic: randomWallet.mnemonic?.phrase || null,
            contractAddress: aiWallet.getAddress(),
          },
        }));

        // ローカルストレージに保存
        localStorage.setItem('aiWallet', JSON.stringify({
          privateKey: aiWallet.getPrivateKey(),
          contractAddress: aiWallet.getAddress()
        }));
      }

      return {
        address: aiWallet.getAddress(),
        privateKey: aiWallet.getPrivateKey(),
        mnemonic: randomWallet.mnemonic?.phrase,
        contractAddress: aiWallet.getAddress(),
      };
    } catch (error) {
      console.error('Failed to create wallet:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isCreating: false,
          error: error instanceof Error ? error.message : '不明なエラーが発生しました',
        }));
      }
      throw error;
    }
  }, [state.isInitialized]);

  const loadExistingWallet = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      throw new Error('Alchemy APIキーが設定されていません');
    }

    const provider = new ethers.providers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
    );

    const storedWalletData = localStorage.getItem('aiWallet');
    if (!storedWalletData) {
      return false;
    }

    try {
      const { privateKey, contractAddress } = JSON.parse(storedWalletData);
      const aiWallet = new AIWallet(privateKey, contractAddress, provider);

      if (mountedRef.current) {
        setWallet(aiWallet);
        setState(prev => ({
          ...prev,
          address: aiWallet.getAddress(),
          isInitialized: true,
          securityInfo: {
            privateKey,
            mnemonic: null,
            contractAddress,
          },
        }));
      }
      return true;
    } catch (error) {
      console.error('Failed to load existing wallet:', error);
      return false;
    }
  }, []);

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

  // Alchemyデータの更新
  const refreshAlchemyData = useCallback(async () => {
    if (!wallet || !mountedRef.current) return;

    setState(prev => ({
      ...prev,
      alchemyData: {
        ...prev.alchemyData,
        isLoading: true
      }
    }));

    try {
      const [transactions, tokenBalances, latestBlock] = await Promise.all([
        wallet.getTransactionHistory(),
        wallet.getTokenBalances(),
        wallet.getLatestBlock()
      ]);

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          alchemyData: {
            transactions: transactions?.transfers || [],
            tokenBalances: tokenBalances?.tokens || [],
            latestBlock,
            isLoading: false
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch Alchemy data:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          alchemyData: {
            ...prev.alchemyData,
            isLoading: false
          }
        }));
      }
    }
  }, [wallet]);

  // イベントの監視設定
  useEffect(() => {
    if (!wallet || !mountedRef.current) return;

    const handleEvent = (event: any) => {
      refreshAlchemyData();
      refreshState();
    };

    wallet.subscribeToEvents(handleEvent);

    return () => {
      // cleanup if needed
    };
  }, [wallet, refreshAlchemyData, refreshState]);

  return {
    ...state,
    createWallet,
    loadExistingWallet,
    executeTransaction,
    toggleLock,
    refreshState,
    refreshAlchemyData,
  };
};
