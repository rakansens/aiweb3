import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { ethers } from 'ethers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AIResponse = {
  action: string;
  params?: {
    to?: string;
    value?: string;
    data?: string;
  };
  message: string;
};

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

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for a Web3 wallet. Parse user commands and respond with JSON in the following format:
          {
            "action": "SEND_TRANSACTION" | "CHECK_BALANCE" | "UNKNOWN",
            "params": {
              "to": "ethereum_address",
              "value": "amount_in_eth",
              "data": "hex_data"
            },
            "message": "human readable response"
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

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI');
    }

    try {
      const parsedResponse = JSON.parse(response);
      
      // バリデーション
      if (parsedResponse.action === 'SEND_TRANSACTION') {
        if (!parsedResponse.params?.to || !ethers.utils.isAddress(parsedResponse.params.to)) {
          throw new Error('Invalid Ethereum address');
        }
        if (parsedResponse.params?.value && isNaN(Number(parsedResponse.params.value))) {
          throw new Error('Invalid ETH amount');
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
