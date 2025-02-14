import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

interface BackupPhraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mnemonic: string;
}

export const BackupPhraseModal: React.FC<BackupPhraseModalProps> = ({
  isOpen,
  onClose,
  mnemonic,
}) => {
  const [isVerified, setIsVerified] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const words = mnemonic.split(' ');

  const handleWordSelect = (word: string) => {
    if (selectedWords.length < words.length) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleVerify = () => {
    if (selectedWords.join(' ') === mnemonic) {
      setIsVerified(true);
    } else {
      setSelectedWords([]);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={() => {}}
      >
        <div className="flex items-center justify-center min-h-screen">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <Dialog.Title className="text-lg font-bold mb-4">
                バックアップフレーズの保存
              </Dialog.Title>

              {!isVerified ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    以下の12単語を正確な順序で安全な場所に保存してください。
                    このフレーズがあれば、ウォレットを復元できます。
                  </p>

                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {words.map((word, index) => (
                      <div
                        key={index}
                        className="p-2 bg-gray-100 rounded text-sm"
                      >
                        <span className="text-gray-500">{index + 1}.</span> {word}
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">フレーズの確認</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedWords.map((word, index) => (
                        <div
                          key={index}
                          className="p-2 bg-blue-100 rounded text-sm"
                        >
                          {word}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {words
                      .sort(() => Math.random() - 0.5)
                      .map((word, index) => (
                        <button
                          key={index}
                          onClick={() => handleWordSelect(word)}
                          disabled={selectedWords.includes(word)}
                          className="p-2 bg-gray-100 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
                        >
                          {word}
                        </button>
                      ))}
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={selectedWords.length !== words.length}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    フレーズを確認
                  </button>
                </>
              ) : (
                <>
                  <p className="text-green-600 mb-4">
                    バックアップフレーズの確認が完了しました！
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    完了
                  </button>
                </>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};
