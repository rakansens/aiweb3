import { useState } from 'react';
import type { WalletInfo } from '../hooks/useWalletList';

type WalletListProps = {
  wallets: WalletInfo[];
  activeWalletId: string | null;
  onSwitchWallet: (id: string) => void;
  onRenameWallet: (id: string, newName: string) => void;
  onRemoveWallet: (id: string) => void;
};

export const WalletList = ({
  wallets,
  activeWalletId,
  onSwitchWallet,
  onRenameWallet,
  onRemoveWallet
}: WalletListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const handleStartEdit = (wallet: WalletInfo) => {
    setEditingId(wallet.id);
    setNewName(wallet.name);
  };

  const handleSaveEdit = (id: string) => {
    if (newName.trim()) {
      onRenameWallet(id, newName.trim());
    }
    setEditingId(null);
    setNewName('');
  };

  return (
    <div className="space-y-4">
      {wallets.map(wallet => (
        <div
          key={wallet.id}
          className={`p-4 rounded-lg border ${
            wallet.id === activeWalletId
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {editingId === wallet.id ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="ウォレット名"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(wallet.id)}
                    className="px-2 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {wallet.name || 'ウォレット'}
                  </h3>
                  <button
                    onClick={() => handleStartEdit(wallet)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    ✎
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500 truncate">
                {wallet.address}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {wallet.id !== activeWalletId && (
                <button
                  onClick={() => onSwitchWallet(wallet.id)}
                  className="px-3 py-1 text-sm text-green-600 border border-green-600 rounded-md hover:bg-green-50"
                >
                  切り替え
                </button>
              )}
              <button
                onClick={() => onRemoveWallet(wallet.id)}
                className="p-1 text-gray-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <span>作成日: {new Date(wallet.createdAt).toLocaleDateString()}</span>
            {wallet.id === activeWalletId && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                アクティブ
              </span>
            )}
          </div>
        </div>
      ))}

      {wallets.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          ウォレットがありません
        </div>
      )}
    </div>
  );
};