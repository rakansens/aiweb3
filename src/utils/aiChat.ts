export type ChatAction = {
  type: 'select' | 'CREATE_WALLET';
  options?: string[];
  step?: 'CREATE' | 'EXPLAIN' | 'CONFIRM' | 'BACKUP';
};

export type ChatResponse = {
  content: string;
  action?: ChatAction;
};

export async function generateChatResponse(
  userMessage: string,
  context?: { 
    walletAddress?: string;
    error?: string;
    status?: string;
  }
): Promise<ChatResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        context
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    // ウォレット作成アクションの特別な処理
    if (data.action?.type === 'CREATE_WALLET') {
      return {
        content: data.content,
        action: {
          type: 'CREATE_WALLET',
          step: data.action.step
        }
      };
    }

    return {
      content: data.content,
      action: data.action
    };
  } catch (error) {
    console.error("AI応答の生成に失敗:", error);
    return {
      content: "申し訳ありません。一時的な問題が発生しました。",
      action: {
        type: "select",
        options: ["もう一度試す", "キャンセル"]
      }
    };
  }
}
