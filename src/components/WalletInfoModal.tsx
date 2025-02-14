import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { WalletCard } from './WalletCard';
import { TransactionList } from './TransactionList';
import { GasEstimate } from './GasEstimate';

type WalletInfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wallet: {
    address: string | null;
    balance: string | null;
    isInitialized: boolean;
    isLocked: boolean;
    alchemyData: {
      transactions: any[];
      isLoading: boolean;
    };
    estimatedGas: string | null;
    processingStep: string | null;
  };
};

export const WalletInfoModal = ({ isOpen, onClose, wallet }: WalletInfoModalProps) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 mb-4">
                  ウォレット詳細情報
                </Dialog.Title>

                <div className="space-y-6">
                  <WalletCard
                    address={wallet.address}
                    balance={wallet.balance}
                    isInitialized={wallet.isInitialized}
                    isLocked={wallet.isLocked}
                  />

                  <GasEstimate
                    estimatedGas={wallet.estimatedGas || '0'}
                    isProcessing={wallet.alchemyData.isLoading}
                    processingStep={wallet.processingStep || undefined}
                  />

                  <TransactionList
                    transactions={wallet.alchemyData.transactions.map(tx => ({
                      hash: tx.hash || '',
                      to: tx.to || '',
                      value: tx.value || '0',
                      timestamp: tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp).getTime() : Date.now(),
                      status: 'confirmed'
                    }))}
                    isLoading={wallet.alchemyData.isLoading}
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={onClose}
                  >
                    閉じる
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};