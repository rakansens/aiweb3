import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { useAICommand } from '../hooks/useAICommand';

type Message = {
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: number;
};

type Conversation = {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
};

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | undefined>();
  const { address, ensName, isConnected, balance, connect, disconnect } = useWallet();
  const [command, setCommand] = useState('');
  const { processCommand, isProcessing, error } = useAICommand(provider);
  const [messages, setMessages] = useState<Message[]>([
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setProvider(new ethers.providers.Web3Provider(window.ethereum));
    }
  }, []);

  useEffect(() => {
    if (conversations.length === 0) {
      startNewConversation();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: command,
      timestamp: Date.now(),
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // 会話履歴も更新
    setConversations(prev => prev.map(conv =>
      conv.id === currentConversation
        ? { ...conv, messages: updatedMessages }
        : conv
    ));
    setCommand('');

    const response = await processCommand(command);
    const assistantMessage: Message = {
      role: 'assistant',
      content: response.success 
        ? `${response.message}${response.transaction ? `\nトランザクションハッシュ: ${response.transaction.hash}` : ''}`
        : `エラー: ${response.error}`,
      timestamp: Date.now(),
    };
    const finalMessages = [...updatedMessages, assistantMessage];
    setMessages(finalMessages);
    
    // 会話履歴も更新
    setConversations(prev => prev.map(conv =>
      conv.id === currentConversation
        ? { ...conv, messages: finalMessages }
        : conv
    ));
  };

  const getCurrentConversation = () => {
    return conversations.find(c => c.id === currentConversation);
  };

  useEffect(() => {
    const current = getCurrentConversation();
    if (current) {
      setMessages(current.messages);
    }
  }, [currentConversation]);

  const startNewConversation = () => {
    const initialMessage: Message = {
      role: 'system',
      content: 'Web3ウォレットへようこそ！ウォレットを接続して、自然言語でトランザクションを実行できます。',
      timestamp: Date.now(),
    };
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: '新しい会話',
      timestamp: Date.now(),
      messages: [initialMessage],
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversation(newConversation.id);
    setMessages(newConversation.messages);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">Super Chat</h1>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <div className="flex items-center gap-8">
                <button className="text-gray-900 text-sm font-medium px-3 relative after:absolute after:bottom-[-20px] after:left-0 after:w-full after:h-0.5 after:bg-gray-900">My Project</button>
                <button className="text-gray-500 hover:text-gray-900 text-sm font-medium px-3">Brand Voice</button>
                <button className="text-gray-500 hover:text-gray-900 text-sm font-medium px-3">Templates</button>
                <button className="text-gray-500 hover:text-gray-900 text-sm font-medium px-3">Tools</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  切断
                </button>
              ) : (
                <button
                  onClick={connect}
                  className="px-3 py-1.5 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600"
                >
                  ウォレット接続
                </button>
              )}
            </div>
          </div>
        </nav>
        {/* メインエリア */}
        <div className="flex flex-1 overflow-hidden">
          {/* チャットエリア */}
          <div className="flex-1 flex flex-col">
            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="max-w-[900px] mx-auto w-full h-full py-8 px-6">
                <div className="min-h-[calc(100%-8rem)] flex flex-col space-y-6">
                  {conversations.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>新規会話を開始してください</p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={message.timestamp}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-6 py-3 ${
                            message.role === 'user'
                              ? 'bg-green-500 text-white shadow-sm'
                              : message.role === 'system'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* 入力エリア */}
            <div className="border-t border-gray-200 bg-white">
              <div className="max-w-[900px] mx-auto px-6 py-4">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder={isConnected ? '例: 0.1 ETHを0x...に送金して' : 'ウォレットを接続してください'}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!isConnected || isProcessing}
                  />
                  <button
                    type="submit"
                    disabled={!isConnected || isProcessing}
                    className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '処理中...' : '送信'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* 履歴サイドバー */}
          <div className="w-[320px] border-l border-gray-200 bg-gray-50 overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900">History Chat</h2>
                <button className="text-gray-500 hover:text-gray-900">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新規会話
              </button>
            </div>

            <div className="px-2 py-1 space-y-1 flex-1">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    currentConversation === conv.id
                      ? 'bg-white shadow-sm border border-gray-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="text-sm text-gray-900">{conv.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            {isConnected && (
              <div className="p-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="text-sm text-gray-500 truncate">
                    {ensName || address}
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {balance ? `${Number(ethers.utils.formatEther(balance.value)).toFixed(4)} ETH` : '0 ETH'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
