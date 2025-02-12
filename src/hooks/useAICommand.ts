import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

type AICommandResponse = {
  action: 'SEND_TRANSACTION' | 'CHECK_BALANCE' | 'UNKNOWN';
  params?: {
    to?: string;
    value?: string;
    data?: string;
  };
  message: string;
};

export const useAICommand = (provider?: ethers.providers.Web3Provider) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCommand = useCallback(async (command: string) => {
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

      const aiResponse: AICommandResponse = await response.json();

      if (aiResponse.action === 'SEND_TRANSACTION' && provider && aiResponse.params) {
        const signer = provider.getSigner();
        const tx = await signer.sendTransaction({
          to: aiResponse.params.to,
          value: aiResponse.params.value ? ethers.utils.parseEther(aiResponse.params.value) : 0,
          data: aiResponse.params.data || '0x',
        });
        
        return {
          success: true,
          message: aiResponse.message,
          transaction: tx,
        };
      }

      return {
        success: true,
        message: aiResponse.message,
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return {
        success: false,
        error: err instanceof Error ? err.message : '不明なエラーが発生しました',
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
