import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type AIResponse = {
  message: string;
  action?: 'CREATE_WALLET' | 'SHOW_SECURITY' | 'BACKUP_WALLET';
  step?: 'EXPLAIN' | 'CONFIRM' | 'CREATE' | 'BACKUP';
  ui?: {
    type: 'input' | 'select';
    options?: string[];
  };
};

async function processWithGemini(command: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    throw new Error('Gemini API key is not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  console.log('Command received:', command);
  
  const prompt = `あなたはWeb3ウォレット作成の専門アシスタントです。
ユーザーの自然言語入力を理解し、ウォレット作成プロセスをガイドしてください。

以下のようなJSONフォーマットで応答してください:

1. ウォレットについての説明や情報提供:
{
  "message": "ウォレットについての説明",
  "ui": {
    "type": "select",
    "options": [
      "ウォレットを作成する",
      "セキュリティについて詳しく知りたい",
      "他に質問がある"
    ]
  }
}

2. ウォレット作成の開始:
{
  "message": "ウォレット作成の説明と注意事項",
  "action": "CREATE_WALLET",
  "step": "EXPLAIN",
  "ui": {
    "type": "select",
    "options": [
      "作成を開始する",
      "もう少し詳しく知りたい",
      "キャンセル"
    ]
  }
}

3. 作成の確認:
{
  "message": "重要な注意事項の確認",
  "action": "CREATE_WALLET",
  "step": "CONFIRM",
  "ui": {
    "type": "select",
    "options": [
      "理解して作成を続ける",
      "キャンセル"
    ]
  }
}

4. セキュリティ情報の表示:
{
  "message": "作成されたウォレットの情報とバックアップ手順",
  "action": "SHOW_SECURITY",
  "step": "BACKUP",
  "ui": {
    "type": "select",
    "options": [
      "情報を保存した",
      "もう一度確認する"
    ]
  }
}

5. 一般的な会話:
{
  "message": "会話の応答",
  "ui": {
    "type": "select",
    "options": [
      "ウォレットを作成する",
      "他の質問をする"
    ]
  }
}

ユーザーの入力に応じて、適切なステップのレスポンスを返してください。
セキュリティに関する説明は具体的に、かつ重要性を強調してください。

ユーザーのコマンド: "${command}"`;

  try {
    console.log('Sending prompt to Gemini...');
    const result = await model.generateContent(prompt);
    if (!result.response) {
      throw new Error('No response from Gemini');
    }
    const response = result.response;
    const text = response.text();
    if (!text) {
      throw new Error('Empty response from Gemini');
    }
    console.log('Raw Gemini response:', text);

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return jsonMatch[0];
    } catch (error) {
      console.error('JSON parsing error:', error);
      return JSON.stringify({
        message: "申し訳ありません。もう一度質問を言い換えていただけますか?",
        ui: {
          type: "select",
          options: [
            "ウォレットについて教えて",
            "最初からやり直す"
          ]
        }
      });
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    return JSON.stringify({
      message: "申し訳ありません。もう一度質問を言い換えていただけますか?",
      ui: {
        type: "select",
        options: [
          "ウォレットについて教えて",
          "最初からやり直す"
        ]
      }
    });
  }
}

async function processWithOpenAI(command: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are a Web3 wallet creation specialist. Guide users through the wallet creation process in Japanese.

Respond with JSON in one of these formats:

1. Wallet Information:
{
  "message": "Explanation about wallets",
  "ui": {
    "type": "select",
    "options": [
      "ウォレットを作成する",
      "セキュリティについて詳しく知りたい",
      "他に質問がある"
    ]
  }
}

2. Start Creation:
{
  "message": "Wallet creation explanation and cautions",
  "action": "CREATE_WALLET",
  "step": "EXPLAIN",
  "ui": {
    "type": "select",
    "options": [
      "作成を開始する",
      "もう少し詳しく知りたい",
      "キャンセル"
    ]
  }
}

3. Confirm Creation:
{
  "message": "Important security confirmation",
  "action": "CREATE_WALLET",
  "step": "CONFIRM",
  "ui": {
    "type": "select",
    "options": [
      "理解して作成を続ける",
      "キャンセル"
    ]
  }
}

4. Show Security Info:
{
  "message": "Created wallet information and backup instructions",
  "action": "SHOW_SECURITY",
  "step": "BACKUP",
  "ui": {
    "type": "select",
    "options": [
      "情報を保存した",
      "もう一度確認する"
    ]
  }
}

5. General Conversation:
{
  "message": "Conversation response",
  "ui": {
    "type": "select",
    "options": [
      "ウォレットを作成する",
      "他の質問をする"
    ]
  }
}

Always respond in Japanese and emphasize security importance.`
      },
      {
        role: "user",
        content: command
      }
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || '';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const aiProvider = process.env.AI_PROVIDER || 'openai';
    console.log('Using AI Provider:', aiProvider);

    const response = aiProvider === 'gemini' 
      ? await processWithGemini(command)
      : await processWithOpenAI(command);

    if (!response) {
      throw new Error('No response from AI');
    }

    try {
      const parsedResponse = JSON.parse(response);
      console.log('Final parsed response:', parsedResponse);
      return res.status(200).json(parsedResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return res.status(200).json({
        message: '申し訳ありません。もう一度質問を言い換えていただけますか?',
        ui: {
          type: 'select',
          options: [
            'ウォレットについて教えて',
            '最初からやり直す'
          ]
        }
      });
    }

  } catch (error) {
    console.error('AI Agent Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
