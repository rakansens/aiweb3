'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIWallet } from '../hooks/useAIWallet';
import { useAICommand } from '../hooks/useAICommand';

type Message = {
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: number;
  ui?: {
    type: 'input' | 'confirm' | 'select' | 'info';
    placeholder?: string;
    options?: string[];
  };
};

const INITIAL_MESSAGE: Message = {
  role: 'system',
  content: 'AIウォレットへようこそ!\n\n以下の操作から選択してください:',
  timestamp: Date.now(),
  ui: {
    type: 'select',
    options: [
      '新しいウォレットを作成',
      'ETHを送金する',
      '残高を確認する',
      'ウォレットをバックアップ'
    ]
  }
};

export default function Home() {
  const wallet = useAIWallet();
  const {
    address,
    balance,
    dailyLimit,
    dailySpent,
    isLocked,
    isInitialized,
    executeTransaction,
    toggleLock,
    refreshState
  } = wallet;

  const { processCommand, isProcessing } = useAICommand(
    { address, balance, dailyLimit, dailySpent, isLocked, isInitialized },
    executeTransaction
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [command, setCommand] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // メッセージの初期化と状態監視
  useEffect(() => {
    let mounted = true;

    const initializeMessages = () => {
      if (isFirstRender) {
        setMessages([INITIAL_MESSAGE]);
        setIsFirstRender(false);
      }
    };

    const updateWalletState = () => {
      if (!mounted || !isInitialized) return;

      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.content?.includes('ウォレットの状態')) return;

      // ウォレット情報の更新メッセージを追加
      const walletStateMessage = {
        role: 'system' as const,
        content: `ウォレットの状態:\n\n残高: ${balance} ETH\n日次制限: ${dailyLimit} ETH\n本日の使用額: ${dailySpent} ETH\nロック状態: ${isLocked ? 'ロック中' : 'アンロック中'}`,
        timestamp: Date.now(),
        ui: {
          type: 'select' as const,
          options: ['送金する', '残高を更新', 'ロック設定を変更']
        }
      };

      // 最後のメッセージがウォレット作成関連の場合は追加しない
      const skipUpdate = lastMessage?.content?.includes('ウォレットを作成') ||
                        lastMessage?.content?.includes('秘密鍵を安全な場所に保存');

      if (!skipUpdate) {
        setMessages(prev => [...prev, walletStateMessage]);
      }
    };

    initializeMessages();
    updateWalletState();

    return () => {
      mounted = false;
    };
  }, [isFirstRender, isInitialized, balance, dailyLimit, dailySpent, isLocked, messages]);

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
              '新しいウォレットを作成',
              'ETHを送金する',
              '残高を確認する',
              'ウォレットをバックアップ'
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
            options: ['最初からやり直す', 'ヘルプを見る']
          }
        }
      ]);
    }
    setCommand('');
  };

  const handleUIAction = async (action: string, value?: string) => {
    try {
      // 特別なアクションの処理
      if (action === 'ロック設定を変更') {
        await toggleLock();
        return;
      }

      if (value) {
        // 送金処理
        try {
          await executeTransaction(value, action);
          setMessages(prev => [...prev, {
            role: 'system',
            content: `送金が完了しました: ${action} ETH -> ${value}`,
            timestamp: Date.now(),
            ui: {
              type: 'select',
              options: ['別の送金を行う', '残高を確認する', '終了']
            }
          }]);
          await refreshState();
          return;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
          setMessages(prev => [...prev, {
            role: 'system',
            content: `送金エラー: ${errorMessage}`,
            timestamp: Date.now(),
            ui: {
              type: 'select',
              options: ['やり直す', '最初に戻る']
            }
          }]);
          return;
        }
      }

      // アクションをコマンドに変換
      const actionToCommand: { [key: string]: string } = {
        '新しいウォレットを作成': 'ウォレットを新規作成',
        '新規作成': 'ウォレットを新規作成',
        'ETHを送金する': 'ETHを送金したい',
        '送金する': 'ETHを送金したい',
        '残高を確認する': '残高を確認',
        '残高を更新': '残高を確認',
        'ウォレットをバックアップ': 'ウォレットのバックアップ'
      };

      const command = actionToCommand[action];
      if (!command) return;

      // ユーザーアクションをメッセージに追加
      setMessages(prev => [...prev, {
        role: 'user',
        content: action,
        timestamp: Date.now()
      }]);

      // コマンドを処理
      const response = await processCommand(command);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        ui: {
          type: 'select',
          options: response.ui?.options || [
            '新しいウォレットを作成',
            'ETHを送金する',
            '残高を確認する',
            'ウォレットをバックアップ'
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
          options: ['最初からやり直す', 'ヘルプを見る']
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
            {/* ウォレット情報 */}
            {isInitialized && (
              <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">アドレス</div>
                    <div className="text-sm font-medium text-gray-900 truncate">{address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">残高</div>
                    <div className="text-lg font-semibold text-gray-900">{balance} ETH</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">日次制限</div>
                    <div className="text-sm font-medium text-gray-900">{dailyLimit} ETH</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">本日の使用額</div>
                    <div className="text-sm font-medium text-gray-900">{dailySpent} ETH</div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={toggleLock}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
                      isLocked
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {isLocked ? 'ロック解除' : 'ロック'}
                  </button>
                </div>
              </div>
            )}

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
                          : message.role === 'system'
                          ? 'bg-blue-50 text-gray-600'
                          : 'bg-white border border-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>

                      {/* UI要素 */}
                      {message.ui && (
                        <div className="mt-4 space-y-3">
                          {message.ui.type === 'input' && (
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={message.ui.placeholder}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUIAction('input', e.currentTarget.value);
                                  }
                                }}
                              />
                            </div>
                          )}
                          {(message.ui.type === 'select' || message.ui.type === 'confirm') && message.ui.options && (
                            <div className="flex flex-wrap gap-2">
                              {message.ui.options.map((option) => (
                                <button
                                  key={option}
                                  onClick={() => handleUIAction(option)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow ${
                                    option.includes('送金') || option.includes('作成') || option === '新規作成'
                                      ? 'bg-green-500 text-white hover:bg-green-600'
                                      : option.includes('キャンセル') || option.includes('やり直す')
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      : option.includes('確認') || option.includes('更新')
                                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
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
                placeholder="自然言語で指示してください(例: ETHを送金したい)"
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
