import { useState, useCallback } from 'react';

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
  }, []);

  return {
    processCommand,
    isProcessing,
    error,
  };
};
