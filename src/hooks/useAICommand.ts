import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

type UIConfig = {
  type: 'input' | 'confirm';
  placeholder?: string;
  options?: string[];
};

type CommandResponse = {
  success: boolean;
  message: string;
  transaction?: ethers.providers.TransactionResponse;
  error?: string;
  ui?: UIConfig;
};

export const useAICommand = (provider?: ethers.providers.Web3Provider) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCommand = useCallback(async (command: string): Promise<CommandResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      // プロバイダーの状態を確認
      if (!provider) {
        throw new Error('ウォレットが接続されていません');
      }

      // ネットワークの状態を確認
      try {
        await provider.getNetwork();
      } catch (error) {
        console.error('Network error:', error);
        throw new Error('ネットワークに接続できません');
      }

      // APIリクエスト
      const response = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error('AIエージェントとの通信に失敗しました');
      }

      const aiResponse = await response.json();

      // 残高確認の処理
      if (aiResponse.action === 'CHECK_BALANCE') {
        try {
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          const balance = await provider.getBalance(address);
          const balanceInEth = ethers.utils.formatEther(balance);
          const balanceFormatted = Number(balanceInEth).toFixed(4);
          
          return {
            success: true,
            message: `現在の残高は ${balanceFormatted} ETHです。\n\n送金する場合は「ETHを送金したい」と入力してください。`,
          };
        } catch (error) {
          console.error('Balance check error:', error);
          throw new Error('残高の取得に失敗しました。MetaMaskが正しく接続されているか確認してください。');
        }
      }

      // 送金処理
      if (aiResponse.action === 'SEND_TRANSACTION' && aiResponse.params?.step === 'confirm') {
        try {
          const signer = provider.getSigner();
          const tx = await signer.sendTransaction({
            to: aiResponse.params.to,
            value: aiResponse.params.value ? ethers.utils.parseEther(aiResponse.params.value) : 0,
            data: aiResponse.params.data || '0x',
          });
          
          return {
            success: true,
            message: `送金トランザクションを送信しました。\nハッシュ: ${tx.hash}\n\n承認されるまでしばらくお待ちください。`,
            transaction: tx,
          };
        } catch (error) {
          console.error('Transaction error:', error);
          if (error instanceof Error) {
            if (error.message.includes('user rejected')) {
              throw new Error('トランザクションがキャンセルされました');
            } else if (error.message.includes('insufficient funds')) {
              throw new Error('残高が不足しています');
            }
          }
          throw new Error('送金処理に失敗しました。MetaMaskが正しく接続されているか確認してください。');
        }
      }

      // その他のレスポンス
      return {
        success: true,
        message: aiResponse.message,
        ui: aiResponse.ui,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(errorMessage);
      console.error('AI Command Error:', err);

      return {
        success: false,
        error: errorMessage,
        message: `エラー: ${errorMessage}\n\nMetaMaskが正しく接続されているか確認してください。`,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [provider]);

  return {
    processCommand,
    isProcessing,
    error,
  };
};
