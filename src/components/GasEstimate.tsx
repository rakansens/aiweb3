type GasEstimateProps = {
  estimatedGas: string | null;
  isProcessing: boolean;
  processingStep?: string;
};

export const GasEstimate = ({ estimatedGas, isProcessing, processingStep }: GasEstimateProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">ガス代の見積もり</h3>
        {isProcessing && (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full mr-2"></div>
            <span className="text-sm text-gray-500">処理中...</span>
          </div>
        )}
      </div>

      {estimatedGas && (
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">推定ガス代:</span>
            <span className="text-sm font-medium text-gray-900">{estimatedGas} ETH</span>
          </div>
          <div className="mt-1">
            <div className="text-xs text-gray-500">
              * 実際のガス代は市場の状況により変動する可能性があります
            </div>
          </div>
        </div>
      )}

      {isProcessing && processingStep && (
        <div className="border-t border-gray-100 pt-3 mt-3">
          <div className="text-sm text-gray-700">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <div className="absolute top-0 left-0 h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
              </div>
              <span>{processingStep}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};