import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

type Transaction = {
  hash: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
};

type TransactionListProps = {
  transactions: Transaction[];
  isLoading?: boolean;
};

export const TransactionList = ({ transactions, isLoading }: TransactionListProps) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-4">
          <p className="text-gray-500">トランザクション履歴はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">トランザクション履歴</h2>
      <div className="space-y-4">
        {transactions.map((tx) => (
          <div
            key={tx.hash}
            className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tx.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : tx.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {tx.status === 'confirmed'
                    ? '完了'
                    : tx.status === 'pending'
                    ? '処理中'
                    : '失敗'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {tx.value} ETH
              </span>
            </div>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">To:</span>
                <code className="text-sm font-mono text-gray-900 break-all">
                  {tx.to}
                </code>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Hash:</span>
                <code className="text-sm font-mono text-gray-900 break-all">
                  {tx.hash}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};