import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ethers } from 'ethers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type AIResponse = {
  action: string;
  params?: {
    to?: string;
    value?: string;
    data?: string;
    step?: string;
    needConfirmation?: boolean;
  };
  message: string;
  ui?: {
    type: 'input' | 'confirm';
    placeholder?: string;
    options?: string[];
  };
};

function formatJsonString(input: string): string {
  const defaultResponse = {
    action: "UNKNOWN",
    message: "コマンドを理解できませんでした。\n例: ETHを送金したい"
  };

  try {
    const jsonMatch = input.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return JSON.stringify(defaultResponse);
    }

    let cleanJson = jsonMatch[0]
      .replace(/\s+/g, ' ')
      .replace(/\\n/g, '\n')
      .trim();

    cleanJson = cleanJson
      .replace(/"\s*"([^"]+)"/g, '","$1"')
      .replace(/}\s*"([^"]+)"/g, '},"$1"')
      .replace(/"\s*{/g, '",{')
      .replace(/""/g, '"')
      .replace(/"\s*:\s*"/g, '":"')
      .replace(/"\s*:\s*{/g, '":{')
      .replace(/"\s*:\s*\[/g, '":[')
      .replace(/}\s*,\s*"/g, '},"')
      .replace(/"\s*,\s*"/g, '","');

    const parsed = JSON.parse(cleanJson);
    
    if (!parsed.action || !parsed.message) {
      console.log('Missing required fields, using default response');
      return JSON.stringify(defaultResponse);
    }

    if (parsed.action === 'SEND_TRANSACTION') {
      // 送金プロセスのステップ管理
      if (!parsed.params?.step) {
        // 初期ステップ: 送金先の確認
        if (!parsed.params?.to) {
          return JSON.stringify({
            action: "SEND_TRANSACTION",
            params: { step: "input_address" },
            message: "送金先のイーサリアムアドレスを入力してください。\n(例: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e)",
            ui: {
              type: "input",
              placeholder: "0x..."
            }
          });
        }
        // 金額の確認
        if (!parsed.params?.value) {
          return JSON.stringify({
            action: "SEND_TRANSACTION",
            params: { 
              step: "input_amount",
              to: parsed.params.to 
            },
            message: `送金先アドレス: ${parsed.params.to}\n\n送金額(ETH)を入力してください。`,
            ui: {
              type: "input",
              placeholder: "0.1"
            }
          });
        }
        // 最終確認
        return JSON.stringify({
          action: "SEND_TRANSACTION",
          params: {
            to: parsed.params.to,
            value: parsed.params.value,
            data: "0x",
            step: "confirm",
            needConfirmation: true
          },
          message: `以下の内容で送金を実行しますか?\n\n送金先: ${parsed.params.to}\n送金額: ${parsed.params.value} ETH\n\n※送金後は取り消しできません。内容をよく確認してください。`,
          ui: {
            type: "confirm",
            options: ["送金を実行", "キャンセル"]
          }
        });
      }
    }

    if (parsed.action === 'CHECK_BALANCE') {
      return JSON.stringify({
        action: "CHECK_BALANCE",
        message: "現在の残高を表示します。",
      });
    }

    const finalResponse = {
      action: parsed.action,
      ...(parsed.params && { params: parsed.params }),
      message: parsed.message,
      ...(parsed.ui && { ui: parsed.ui })
    };

    return JSON.stringify(finalResponse);
  } catch (error) {
    console.error('JSON formatting error:', error);
    return JSON.stringify(defaultResponse);
  }
}

async function processWithGemini(command: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    throw new Error('Gemini API key is not configured');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  console.log('Command received:', command);
  
  const prompt = `あなたはWeb3ウォレットのAIアシスタントです。
以下のコマンドに対して、指定された形式で応答してください。

残高確認の場合(例: "残高確認"、"残高教えて"など):
{
  "action": "CHECK_BALANCE",
  "message": "現在の残高を表示します。"
}

送金の場合(例: "送金したい"、"ETHを送る"など):
{
  "action": "SEND_TRANSACTION",
  "params": {
    "step": "input_address" | "input_amount" | "confirm",
    "to": "送金先アドレス(あれば)",
    "value": "送金額(ETH)(あれば)",
    "data": "0x"
  },
  "message": "対話的なメッセージ",
  "ui": {
    "type": "input" | "confirm",
    "placeholder": "入力プレースホルダー",
    "options": ["選択肢1", "選択肢2"]
  }
}

不明なコマンドの場合:
{
  "action": "UNKNOWN",
  "message": "申し訳ありません。以下のようなコマンドを使用してください:\\n- 残高を確認して\\n- ETHを送金したい"
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

    const formattedJson = formatJsonString(text);
    console.log('Formatted JSON:', formattedJson);
    return formattedJson;
  } catch (error) {
    console.error('Gemini API Error:', error);
    return JSON.stringify({
      action: "UNKNOWN",
      message: "申し訳ありません。コマンドを理解できませんでした。以下のようなコマンドを試してください:\n- 残高を確認して\n- ETHを送金したい"
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse | { error: string }>
) {
  console.log('AI Agent Request:', req.body);
  console.log('AI Provider:', process.env.AI_PROVIDER);
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
      
      if (parsedResponse.action === 'SEND_TRANSACTION' && parsedResponse.params?.step === 'confirm') {
        if (!parsedResponse.params?.to || !ethers.utils.isAddress(parsedResponse.params.to)) {
          throw new Error('無効なイーサリアムアドレスです');
        }
        if (parsedResponse.params?.value && isNaN(Number(parsedResponse.params.value))) {
          throw new Error('無効なETH金額です');
        }
      }

      return res.status(200).json(parsedResponse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return res.status(500).json({
        action: 'UNKNOWN',
        message: '申し訳ありません。コマンドを正しく解釈できませんでした。'
      });
    }

  } catch (error) {
    console.error('AI Agent Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function processWithOpenAI(command: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant for a Web3 wallet. Parse user commands and respond with JSON in the following format:
        {
          "action": "SEND_TRANSACTION" | "CHECK_BALANCE" | "UNKNOWN",
          "params": {
            "step": "input_address" | "input_amount" | "confirm",
            "to": "ethereum_address",
            "value": "amount_in_eth",
            "data": "hex_data"
          },
          "message": "human readable response",
          "ui": {
            "type": "input" | "confirm",
            "placeholder": "input placeholder",
            "options": ["option1", "option2"]
          }
        }`
      },
      {
        role: "user",
        content: command
      }
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content || '';
}
