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
  processingStep: 'init' | 'contract' | 'security' | 'complete' | null;
  creationProgress: {
    step: string;
    message: string;
  } | null;
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
  processingStep: null,
  creationProgress: null
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

  // キャッシュの有効期限(5分)
  const CACHE_DURATION = 5 * 60 * 1000;
  const stateCache = useRef<{
    data: any;
    timestamp: number;
  } | null>(null);

  const refreshState = useCallback(async () => {
    if (!wallet || !mountedRef.current) return;

    // キャッシュが有効な場合はキャッシュを使用
    const cache = stateCache.current;
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      setState(prev => ({
        ...prev,
        ...cache.data
      }));
      return;
    }

    try {
      const [balance, dailyLimit, dailySpent, isLocked] = await Promise.all([
        wallet.getBalance(),
        wallet.getDailyLimit(),
        wallet.getDailySpent(),
        wallet.isLocked()
      ]);

      const newState = {
        balance,
        dailyLimit,
        dailySpent,
        isLocked,
      };

      // キャッシュを更新
      stateCache.current = {
        data: newState,
        timestamp: Date.now()
      };

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          ...newState
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

    setState(prev => ({
      ...prev,
      isCreating: true,
      error: null,
      processingStep: 'init',
      creationProgress: {
        step: 'init',
        message: 'ウォレットの初期化中...'
      }
    }));

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

      setState(prev => ({
        ...prev,
        processingStep: 'contract',
        creationProgress: {
          step: 'contract',
          message: 'スマートコントラクトをデプロイ中...'
        }
      }));

      // ウォレット作成
      const aiWallet = await AIWallet.create();
      const randomWallet = ethers.Wallet.createRandom();

      setState(prev => ({
        ...prev,
        processingStep: 'security',
        creationProgress: {
          step: 'security',
          message: 'セキュリティ設定を適用中...'
        }
      }));

      // 状態を更新
      if (mountedRef.current) {
        setWallet(aiWallet);
        setState(prev => ({
          ...prev,
          address: aiWallet.getAddress(),
          isInitialized: true,
          isCreating: false,
          processingStep: 'complete',
          creationProgress: {
            step: 'complete',
            message: 'ウォレットの作成が完了しました!'
          },
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
          processingStep: null,
          creationProgress: null,
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

    // 初回のみ状態を更新
    refreshState();
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

    let isFirstLoad = true;
    const handleEvent = (event: any) => {
      // イベント発生時のみ更新を実行
      if (event.type === 'transaction' || event.type === 'block') {
        refreshState();
        // トランザクション関連のイベントの場合のみAlchemyデータを更新
        if (event.type === 'transaction') {
          refreshAlchemyData();
        }
      }
    };

    wallet.subscribeToEvents(handleEvent);

    // 初回のみAlchemyデータを取得
    if (isFirstLoad) {
      refreshAlchemyData();
      isFirstLoad = false;
    }

    return () => {
      wallet.unsubscribeFromEvents();
    };
  }, [wallet]);

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
