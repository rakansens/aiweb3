'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAICommand } from '../hooks/useAICommand';

type Message = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
  ui?: {
    type: 'input' | 'select';
    options?: string[];
  };
};

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'こんにちは!AIアシスタントです。\n\nウォレットの作成をお手伝いできます。気軽に話しかけてください。',
  timestamp: Date.now(),
  ui: {
    type: 'select',
    options: [
      'ウォレットについて教えて',
      'ウォレットを作成したい'
    ]
  }
};

export default function Home() {
  const { processCommand, isProcessing } = useAICommand();
  const [messages, setMessages] = useState<Message[]>([]);
  const [command, setCommand] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // メッセージの初期化
  useEffect(() => {
    if (isFirstRender) {
      setMessages([INITIAL_MESSAGE]);
      setIsFirstRender(false);
    }
  }, [isFirstRender]);

  // スクロール処理
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: command,
      timestamp: Date.now(),
    };

    try {
      const response = await processCommand(command);
      setMessages(prev => [
        ...prev,
        userMessage,
        {
          role: 'assistant',
          content: response.message,
          timestamp: Date.now(),
          ui: {
            type: 'select',
            options: response.ui?.options || [
              'ウォレットについて教えて',
              'ウォレットを作成したい'
            ]
          }
        }
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setMessages(prev => [
        ...prev,
        userMessage,
        {
          role: 'assistant',
          content: `エラー: ${errorMessage}`,
          timestamp: Date.now(),
          ui: {
            type: 'select',
            options: ['最初からやり直す']
          }
        }
      ]);
    }
    setCommand('');
  };

  const handleUIAction = async (action: string) => {
    try {
      setMessages(prev => [...prev, {
        role: 'user',
        content: action,
        timestamp: Date.now()
      }]);

      const response = await processCommand(action);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        ui: {
          type: 'select',
          options: response.ui?.options || [
            'ウォレットについて教えて',
            'ウォレットを作成したい'
          ]
        }
      }]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `エラー: ${errorMessage}`,
        timestamp: Date.now(),
        ui: {
          type: 'select',
          options: ['最初からやり直す']
        }
      }]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-[800px] mx-auto w-full h-full py-8 px-6">
            {/* メッセージ履歴 */}
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.timestamp}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
                >
                  <div className="max-w-[80%]">
                    {/* メッセージヘッダー */}
                    <div className="text-xs text-gray-500 mb-1 px-2">
                      {message.role === 'user' ? 'あなた' : 'AIアシスタント'}
                    </div>

                    {/* メッセージ本文 */}
                    <div
                      className={`rounded-2xl px-6 py-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-green-500 text-white'
                          : 'bg-white border border-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                      {/* UI要素 */}
                      {message.ui && (
                        <div className="mt-4 space-y-3">
                          {message.ui.type === 'select' && message.ui.options && (
                            <div className="flex flex-wrap gap-2">
                              {message.ui.options.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => handleUIAction(option)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow ${
                                    option.includes('作成')
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : option.includes('やり直す')
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* 入力フォーム */}
        <div className="border-t border-gray-200 bg-white shadow-sm">
          <div className="max-w-[800px] mx-auto px-6 py-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="メッセージを入力してください"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
                disabled={isProcessing}
              />
              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isProcessing ? '処理中...' : '送信'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
