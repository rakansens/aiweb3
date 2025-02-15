import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { WalletList } from './WalletList';
import type { WalletInfo } from '../hooks/useWalletList';

type WalletListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletInfo[];
  activeWalletId: string | null;
  onSwitchWallet: (id: string) => void;
  onRenameWallet: (id: string, newName: string) => void;
  onRemoveWallet: (id: string) => void;
};

export const WalletListModal = ({
  isOpen,
  onClose,
  wallets,
  activeWalletId,
  onSwitchWallet,
  onRenameWallet,
  onRemoveWallet
}: WalletListModalProps) => {
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
                  ウォレット管理
                </Dialog.Title>

                <div className="mt-4">
                  <WalletList
                    wallets={wallets}
                    activeWalletId={activeWalletId}
                    onSwitchWallet={onSwitchWallet}
                    onRenameWallet={onRenameWallet}
                    onRemoveWallet={onRemoveWallet}
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