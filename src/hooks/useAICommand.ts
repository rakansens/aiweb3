import { useState, useCallback } from 'react';
import { useAIWallet } from './useAIWallet';

type UIConfig = {
  type: 'input' | 'select';
  options?: string[];
};

type CommandResponse = {
  success: boolean;
  message: string;
  error?: string;
  ui?: UIConfig;
};

export const useAICommand = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wallet = useAIWallet();

  const processCommand = useCallback(async (command: string): Promise<CommandResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
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

      // ウォレット作成アクションの処理
      if (aiResponse.action === 'CREATE_WALLET') {
        switch (aiResponse.step) {
          case 'EXPLAIN':
          case 'CONFIRM':
            // 説明と確認ステップはそのまま返す
            return {
              success: true,
              message: aiResponse.message,
              ui: aiResponse.ui
            };
          case 'CREATE':
            try {
              // 既存のウォレットをチェック
              const hasExisting = await wallet.loadExistingWallet();
              if (hasExisting) {
                return {
                  success: false,
                  message: 'すでにウォレットが存在します。新しいウォレットを作成する前に、既存のウォレットのバックアップを確認してください。',
                  ui: {
                    type: 'select',
                    options: ['既存のウォレットを使用', '最初からやり直す']
                  }
                };
              }

              // 新しいウォレットを作成
              const walletInfo = await wallet.createWallet();
              return {
                success: true,
                message: `ウォレットが作成されました!\n\n以下の情報を必ず安全な場所に保存してください:\n\nアドレス: ${walletInfo.address}\n\n※秘密鍵とニーモニックは次の画面で表示されます。`,
                ui: {
                  type: 'select',
                  options: ['セキュリティ情報を表示']
                }
              };
            } catch (error) {
              return {
                success: false,
                message: `ウォレットの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
                ui: {
                  type: 'select',
                  options: ['最初からやり直す']
                }
              };
            }
        }
      }

      // セキュリティ情報の表示
      if (aiResponse.action === 'SHOW_SECURITY' && aiResponse.step === 'BACKUP') {
        if (!wallet.securityInfo.privateKey || !wallet.securityInfo.mnemonic) {
          return {
            success: false,
            message: 'セキュリティ情報が見つかりません。ウォレットの作成からやり直してください。',
            ui: {
              type: 'select',
              options: ['最初からやり直す']
            }
          };
        }

        return {
          success: true,
          message: `重要なセキュリティ情報:\n\n秘密鍵:\n${wallet.securityInfo.privateKey}\n\nニーモニックフレーズ:\n${wallet.securityInfo.mnemonic}\n\nこれらの情報は必ず安全な場所に保存してください。\n\n※この情報は二度と表示されません。`,
          ui: {
            type: 'select',
            options: ['情報を保存した', 'もう一度確認する']
          }
        };
      }

      // その他の応答
      return {
        success: true,
        message: aiResponse.message,
        ui: aiResponse.ui || {
          type: 'select',
          options: [
            'ウォレットについて教えて',
            'ウォレットを作成したい'
          ]
        }
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
          options: ['最初からやり直す']
        }
      };
    } finally {
      setIsProcessing(false);
    }
  }, [wallet]);

  return {
    processCommand,
    isProcessing,
    error,
  };
};
