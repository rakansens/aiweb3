import { useState } from 'react';

type WalletCardProps = {
  address: string | null;
  balance: string | null;
  isInitialized: boolean;
  isLocked: boolean;
  onCopy?: () => void;
};

export const WalletCard = ({ address, balance, isInitialized, isLocked, onCopy }: WalletCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    }
  };

  if (!isInitialized) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">ウォレット情報</h2>
        <div className="flex items-center space-x-2">
          {isLocked ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              ロック中
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              アクティブ
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            アドレス
          </label>
          <div className="flex items-center space-x-2">
            <code className="flex-1 block w-full px-3 py-2 text-sm bg-gray-50 rounded-lg font-mono break-all">
              {address || 'N/A'}
            </code>
            <button
              onClick={handleCopy}
              className="inline-flex items-center px-3 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {copied ? (
                <span className="text-green-600">コピー完了!</span>
              ) : (
                <span>コピー</span>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            残高
          </label>
          <div className="px-3 py-2 bg-gray-50 text-sm rounded-lg">
            {balance ? `${balance} ETH` : '0 ETH'}
          </div>
        </div>
      </div>
    </div>
  );
};