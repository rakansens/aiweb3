const { ethers } = require('ethers');

function createAdminWallet() {
  const wallet = ethers.Wallet.createRandom();
  console.log('\n=== 管理者ウォレット情報 ===');
  console.log('アドレス:', wallet.address);
  console.log('秘密鍵:', wallet.privateKey);
  console.log('ニーモニック:', wallet.mnemonic.phrase);
  console.log('\n重要: この情報は安全に保管してください。\n');
}

createAdminWallet();