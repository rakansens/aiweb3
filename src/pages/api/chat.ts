import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const systemPrompt = `
あなたはAIウォレットアシスタントです。
ユーザーのウォレット作成と管理を支援します。
以下の点に注意して応答してください：

1. 簡潔で親しみやすい日本語で話してください
2. 専門用語は必要な場合のみ使用し、説明を添えてください
3. セキュリティに関する注意点は重要な場合のみ言及してください
4. ユーザーの質問や状況に応じて、適切な選択肢を提示してください
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context } = req.body;

    // ウォレット作成フローの処理
    if (message.includes('作成を開始する')) {
      return res.status(200).json({
        content: 'ウォレットを作成します。セキュリティ情報は安全に保管してください。',
        action: {
          type: 'CREATE_WALLET',
          step: 'CREATE'
        }
      });
    }

    let prompt = message;
    
    // コンテキストに基づいてプロンプトを調整
    if (context) {
      if (context.walletAddress) {
        prompt += `\n\nウォレットアドレス: ${context.walletAddress}`;
      }
      if (context.error) {
        prompt += `\n\nエラー: ${context.error}`;
      }
      if (context.status) {
        prompt += `\n\n現在の状態: ${context.status}`;
      }
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    const content = response.choices[0]?.message?.content || "申し訳ありません。応答の生成に失敗しました。";

    // 選択肢の生成（コンテキストに応じて）
    let action;
    if (message.includes("ウォレットを作成")) {
      action = {
        type: "select",
        options: ["作成を開始する", "もう少し詳しく知りたい", "キャンセル"]
      };
    } else if (context?.error) {
      action = {
        type: "select",
        options: ["もう一度試す", "トラブルシューティング", "キャンセル"]
      };
    }

    return res.status(200).json({ content, action });
  } catch (error) {
    console.error("AI応答の生成に失敗:", error);
    return res.status(500).json({
      content: "申し訳ありません。一時的な問題が発生しました。",
      action: {
        type: "select",
        options: ["もう一度試す", "キャンセル"]
      }
    });
  }
}