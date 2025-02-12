import { useState, useEffect } from 'react';

export type WalletInfo = {
  id: string;
  name: string;
  address: string;
  contractAddress: string;
  privateKey: string;
  isActive: boolean;
  createdAt: number;
};

export const useWalletList = () => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);

  // ローカルストレージからウォレットリストを読み込む
  useEffect(() => {
    const savedWallets = localStorage.getItem('walletList');
    const savedActiveId = localStorage.getItem('activeWalletId');
    
    if (savedWallets) {
      setWallets(JSON.parse(savedWallets));
    }
    if (savedActiveId) {
      setActiveWalletId(savedActiveId);
    }
  }, []);

  // ウォレットリストの変更を保存
  useEffect(() => {
    localStorage.setItem('walletList', JSON.stringify(wallets));
  }, [wallets]);

  // アクティブウォレットの変更を保存
  useEffect(() => {
    if (activeWalletId) {
      localStorage.setItem('activeWalletId', activeWalletId);
    }
  }, [activeWalletId]);

  // 新しいウォレットを追加
  const addWallet = (wallet: Omit<WalletInfo, 'id' | 'createdAt' | 'isActive'>) => {
    // アドレスの重複チェック
    const existingWallet = wallets.find(w => w.address === wallet.address);
    if (existingWallet) {
      console.log('Wallet already exists:', existingWallet);
      // 既存のウォレットをアクティブに設定
      switchActiveWallet(existingWallet.id);
      return existingWallet;
    }

    const newWallet: WalletInfo = {
      ...wallet,
      id: `wallet_${Date.now()}`,
      createdAt: Date.now(),
      isActive: wallets.length === 0 // 最初のウォレットの場合はアクティブに
    };

    setWallets(prev => [...prev, newWallet]);
    
    // 最初のウォレットの場合はアクティブに設定
    if (wallets.length === 0) {
      setActiveWalletId(newWallet.id);
    }

    console.log('New wallet added:', newWallet);
    return newWallet;
  };

  // ウォレットの名前を変更
  const renameWallet = (id: string, newName: string) => {
    setWallets(prev =>
      prev.map(wallet =>
        wallet.id === id ? { ...wallet, name: newName } : wallet
      )
    );
  };

  // アクティブなウォレットを切り替え
  const switchActiveWallet = (id: string) => {
    setWallets(prev =>
      prev.map(wallet => ({
        ...wallet,
        isActive: wallet.id === id
      }))
    );
    setActiveWalletId(id);
  };

  // ウォレットを削除
  const removeWallet = (id: string) => {
    setWallets(prev => prev.filter(wallet => wallet.id !== id));
    if (activeWalletId === id) {
      const remainingWallets = wallets.filter(wallet => wallet.id !== id);
      setActiveWalletId(remainingWallets[0]?.id || null);
    }
  };

  // アクティブなウォレットを取得
  const getActiveWallet = () => {
    return wallets.find(wallet => wallet.id === activeWalletId);
  };

  return {
    wallets,
    activeWalletId,
    addWallet,
    renameWallet,
    switchActiveWallet,
    removeWallet,
    getActiveWallet
  };
};