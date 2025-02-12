import { useEffect, useState } from 'react';

type WalletCreationStep = {
  id: string;
  title: string;
  description: string;
};

const CREATION_STEPS: WalletCreationStep[] = [
  {
    id: 'init',
    title: 'ウォレットの初期化',
    description: '新しいウォレットの準備をしています...'
  },
  {
    id: 'contract',
    title: 'スマートコントラクトのデプロイ',
    description: 'ブロックチェーン上にウォレットを作成しています...'
  },
  {
    id: 'security',
    title: 'セキュリティ設定',
    description: '安全な設定を適用しています...'
  },
  {
    id: 'complete',
    title: '完了',
    description: 'ウォレットの準備が整いました!'
  }
];

type Props = {
  isCreating: boolean;
  currentStep?: 'init' | 'contract' | 'security' | 'complete' | null;
};

export const WalletCreationProgress = ({ isCreating, currentStep }: Props) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isCreating) {
      setActiveStep(0);
      return;
    }

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (currentStep === 'complete' || !isCreating) {
          clearInterval(interval);
          return CREATION_STEPS.length - 1;
        }
        return (prev + 1) % (CREATION_STEPS.length - 1);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isCreating, currentStep]);

  if (!isCreating) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          ウォレットを作成中...
        </h3>

        <div className="space-y-6">
          {CREATION_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start space-x-3 ${
                index > activeStep ? 'opacity-40' : ''
              }`}
            >
              <div
                className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                  index === activeStep
                    ? 'bg-green-500 animate-pulse'
                    : index < activeStep
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`}
              >
                {index < activeStep && (
                  <svg
                    className="h-4 w-4 text-white"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">
                  {step.title}
                </h4>
                <p className="mt-1 text-sm text-gray-500">{step.description}</p>
              </div>

              {index === activeStep && (
                <div className="flex-shrink-0">
                  <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {currentStep === 'complete' && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setActiveStep(0)}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              完了
            </button>
          </div>
        )}
      </div>
    </div>
  );
};