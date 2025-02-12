import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import type { WalletState } from './useAIWallet';

type UIConfig = {
  type: 'input' | 'confirm' | 'select' | 'info';
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

export const useAICommand = (walletState: WalletState, executeTransaction: (to: string, value: string) => Promise<any>) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCommand = useCallback(async (command: string): Promise<CommandResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
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

      // ウォレット作成の処理
      if (aiResponse.action === 'WALLET_SETUP') {
        // 初期化済みの場合は警告
        if (walletState.isInitialized && aiResponse.params?.operation === '新規作成') {
          return {
            success: false,
            message: 'すでにウォレットが初期化されています。新しいウォレットを作成する前に、現在のウォレットをバックアップしてください。',
            ui: {
              type: 'select',
              options: ['ウォレットをバックアップ', '戻る']
            }
          };
        }

        return {
          success: true,
          message: aiResponse.message,
          ui: aiResponse.ui,
        };
      }

      // 以下のアクションはウォレットの初期化が必要
      if (!walletState.isInitialized || !walletState.address) {
        return {
          success: false,
          message: 'ウォレットが初期化されていません。新しいウォレットを作成するか、既存のウォレットをリストアしてください。',
          ui: {
            type: 'select',
            options: ['新しいウォレットを作成', '既存のウォレットをリストア']
          }
        };
      }

      if (walletState.isLocked) {
        return {
          success: false,
          message: 'ウォレットがロックされています。操作を続行するにはロックを解除してください。',
          ui: {
            type: 'select',
            options: ['ロックを解除', '戻る']
          }
        };
      }

      // 残高確認の処理
      if (aiResponse.action === 'CHECK_BALANCE') {
        if (!walletState.balance) {
          return {
            success: false,
            message: 'ウォレットの残高を取得できません。ネットワーク接続を確認してください。',
            ui: {
              type: 'select',
              options: ['再試行', '戻る']
            }
          };
        }

        return {
          success: true,
          message: `現在の残高は ${walletState.balance} ETHです。\n日次制限: ${walletState.dailyLimit} ETH\n本日の使用額: ${walletState.dailySpent} ETH`,
          ui: {
            type: 'select',
            options: ['送金する', '履歴を見る', '戻る']
          }
        };
      }

      // 送金処理
      if (aiResponse.action === 'SEND_TRANSACTION' && aiResponse.params?.step === 'confirm') {
        try {
          const tx = await executeTransaction(
            aiResponse.params.to || '',
            aiResponse.params.value || '0'
          );
          
          return {
            success: true,
            message: `送金トランザクションを送信しました。\n送金先: ${aiResponse.params.to}\n金額: ${aiResponse.params.value} ETH`,
            transaction: tx,
            ui: {
              type: 'select',
              options: ['別の送金を行う', '残高を確認する', '終了']
            }
          };
        } catch (error) {
          console.error('Transaction error:', error);
          if (error instanceof Error) {
            throw new Error(`送金処理に失敗しました: ${error.message}`);
          }
          throw new Error('送金処理に失敗しました。');
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
        message: `エラー: ${errorMessage}`,
        ui: {
          type: 'select',
          options: ['最初からやり直す', 'ヘルプを見る']
        }
      };
    } finally {
      setIsProcessing(false);
    }
  }, [walletState, executeTransaction]);

  return {
    processCommand,
    isProcessing,
    error,
  };
};
