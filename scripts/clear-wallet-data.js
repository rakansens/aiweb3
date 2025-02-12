// ウォレットデータをクリアするスクリプト
console.log('Clearing wallet data...');

try {
  localStorage.removeItem('walletList');
  localStorage.removeItem('activeWalletId');
  localStorage.removeItem('aiWallet');
  console.log('Wallet data cleared successfully');
} catch (error) {
  console.error('Error clearing wallet data:', error);
}