import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WalletSecurityInfo, WalletCreationStep } from '../types/wallet';

interface WalletCreationFlowProps {
  onComplete: (securityInfo: WalletSecurityInfo) => void;
  onCancel: () => void;
}

export const WalletCreationFlow: React.FC<WalletCreationFlowProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<WalletCreationStep['step']>('generate');
  const [securityInfo, setSecurityInfo] = useState<WalletSecurityInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationWords, setVerificationWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const steps: WalletCreationStep[] = [
    {
      step: 'generate',
      title: 'ウォレットの生成',
      description: '安全なウォレットを生成しています...',
    },
    {
      step: 'backup',
      title: 'バックアップフレーズの保存',
      description: '以下の12単語を正確な順序で安全な場所に保存してください。',
    },
    {
      step: 'verify',
      title: 'フレーズの確認',
      description: '保存したバックアップフレーズを正しい順序で選択してください。',
    },
    {
      step: 'secure',
      title: 'パスワードの設定',
      description: 'ウォレットを保護するための強力なパスワードを設定してください。',
    },
    {
      step: 'complete',
      title: '設定完了',
      description: 'ウォレットの作成が完了しました。',
    },
  ];

  useEffect(() => {
    if (currentStep === 'generate') {
      generateWallet();
    }
  }, [currentStep]);

  const generateWallet = async () => {
    try {
      const wallet = ethers.Wallet.createRandom();
      setSecurityInfo({
        mnemonic: wallet.mnemonic?.phrase || '',
        privateKey: wallet.privateKey,
      });
      setCurrentStep('backup');
    } catch (error) {
      console.error('ウォレット生成エラー:', error);
    }
  };

  const handleBackupComplete = () => {
    if (securityInfo?.mnemonic) {
      const words = securityInfo.mnemonic.split(' ');
      setVerificationWords(words);
      setCurrentStep('verify');
    }
  };

  const handleWordSelect = (word: string) => {
    setSelectedWords([...selectedWords, word]);
  };

  const handleVerificationComplete = () => {
    if (verificationWords.join(' ') === selectedWords.join(' ')) {
      setCurrentStep('secure');
    } else {
      // エラー表示
      setSelectedWords([]);
    }
  };

  const handlePasswordSubmit = () => {
    if (password === confirmPassword && password.length >= 8) {
      if (securityInfo) {
        onComplete({ ...securityInfo, password });
      }
      setCurrentStep('complete');
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">{steps.find(s => s.step === currentStep)?.title}</h2>
        <p className="text-gray-600">{steps.find(s => s.step === currentStep)?.description}</p>
      </div>

      {currentStep === 'backup' && securityInfo && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {securityInfo.mnemonic.split(' ').map((word, index) => (
              <div key={index} className="p-2 bg-gray-100 rounded">
                <span className="text-gray-500">{index + 1}.</span> {word}
              </div>
            ))}
          </div>
          <button
            onClick={handleBackupComplete}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            バックアップ完了
          </button>
        </div>
      )}

      {currentStep === 'verify' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {verificationWords.map((word, index) => (
              <button
                key={index}
                onClick={() => handleWordSelect(word)}
                disabled={selectedWords.includes(word)}
                className="p-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {word}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="font-bold mb-2">選択された単語:</h3>
            <div className="grid grid-cols-3 gap-2">
              {selectedWords.map((word, index) => (
                <div key={index} className="p-2 bg-blue-100 rounded">
                  {word}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleVerificationComplete}
            disabled={selectedWords.length !== verificationWords.length}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            確認
          </button>
        </div>
      )}

      {currentStep === 'secure' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="8文字以上の強力なパスワード"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="パスワードを再入力"
            />
          </div>
          <button
            onClick={handlePasswordSubmit}
            disabled={password !== confirmPassword || password.length < 8}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            完了
          </button>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};
