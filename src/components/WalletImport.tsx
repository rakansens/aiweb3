import React, { useState } from 'react';
import { ethers } from 'ethers';
import { WalletImportOptions } from '../types/wallet';

interface WalletImportProps {
  onImport: (wallet: ethers.Wallet) => void;
  onCancel: () => void;
}

export const WalletImport: React.FC<WalletImportProps> = ({ onImport, onCancel }) => {
  const [importType, setImportType] = useState<'privateKey' | 'mnemonic' | 'keystore'>('privateKey');
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleImport = async () => {
    try {
      setError('');
      let wallet: ethers.Wallet;

      switch (importType) {
        case 'privateKey':
          wallet = new ethers.Wallet(input);
          break;
        case 'mnemonic':
          wallet = ethers.Wallet.fromMnemonic(input);
          break;
        case 'keystore':
          wallet = await ethers.Wallet.fromEncryptedJson(input, password);
          break;
        default:
          throw new Error('無効なインポートタイプです');
      }

      onImport(wallet);
    } catch (err) {
      setError('ウォレットのインポートに失敗しました。入力を確認してください。');
      console.error('Import error:', err);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4">ウォレットのインポート</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          インポート方法
        </label>
        <div className="flex space-x-4">
          <button
            onClick={() => setImportType('privateKey')}
            className={`px-4 py-2 rounded ${
              importType === 'privateKey' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            秘密鍵
          </button>
          <button
            onClick={() => setImportType('mnemonic')}
            className={`px-4 py-2 rounded ${
              importType === 'mnemonic' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            ニーモニック
          </button>
          <button
            onClick={() => setImportType('keystore')}
            className={`px-4 py-2 rounded ${
              importType === 'keystore' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Keystore
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {importType === 'privateKey' && '秘密鍵'}
          {importType === 'mnemonic' && 'ニーモニックフレーズ'}
          {importType === 'keystore' && 'Keystoreファイル（JSON）'}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
          placeholder={
            importType === 'privateKey'
              ? '0x で始まる秘密鍵を入力'
              : importType === 'mnemonic'
              ? '12または24個の単語をスペースで区切って入力'
              : 'Keystoreの内容を入力'
          }
        />
      </div>

      {importType === 'keystore' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Keystoreのパスワードを入力"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          キャンセル
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          インポート
        </button>
      </div>
    </div>
  );
};
