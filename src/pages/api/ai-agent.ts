import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type AIResponse = {
  message: string;
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
  
  const prompt = `あなたはAIアシスタントです。
ユーザーの自然言語入力を理解し、適切に応答してください。

ウォレットに関する質問や作成の要望には、以下のような応答をJSONで返してください:

{
  "message": "ウォレットについての説明や作成手順のガイド",
  "ui": {
    "type": "select",
    "options": [
      "ウォレットについてもっと詳しく",
      "ウォレットを作成する",
      "セキュリティについて知りたい"
    ]
  }
}

一般的な会話の場合は以下のような形式で応答してください:

{
  "message": "会話の応答",
  "ui": {
    "type": "select",
    "options": [
      "関連する質問や選択肢",
      "ウォレットについて聞く"
    ]
  }
}

ユーザーのコマンド: "${command}"

必ず上記のいずれかの形式の有効なJSONで応答してください。`;

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
        content: `You are an AI assistant. Understand user's natural language input in Japanese and respond appropriately.

For wallet-related questions or creation requests, respond with JSON in this format:

{
  "message": "Explanation about wallet or creation guide",
  "ui": {
    "type": "select",
    "options": [
      "ウォレットについてもっと詳しく",
      "ウォレットを作成する",
      "セキュリティについて知りたい"
    ]
  }
}

For general conversation, respond with JSON in this format:

{
  "message": "Conversation response",
  "ui": {
    "type": "select",
    "options": [
      "Related questions or choices",
      "ウォレットについて聞く"
    ]
  }
}

Always respond in Japanese and include appropriate UI options for user interaction.`
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
