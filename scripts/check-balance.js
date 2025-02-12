const { ethers } = require('ethers');

async function checkBalance() {
  const address = '0x2CacAbF77C7aE00671E4D81E197672D6042092f0';
  
  // メインネットのプロバイダー
  const mainnetProvider = new ethers.providers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/olR3sf681_W_sHbRsoQzucYeOEcoCr-I');
  
  // Sepoliaのプロバイダー
  const sepoliaProvider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/olR3sf681_W_sHbRsoQzucYeOEcoCr-I');
  
  try {
    // メインネットの残高確認
    const mainnetBalance = await mainnetProvider.getBalance(address);
    console.log('\n=== メインネット残高 ===');
    console.log(`アドレス: ${address}`);
    console.log(`残高: ${ethers.utils.formatEther(mainnetBalance)} ETH`);
    
    if (mainnetBalance.gte(ethers.utils.parseEther('0.001'))) {
      console.log('✅ 残高が0.001 ETH以上あります。Sepoliaフォーセットが使用可能です。');
    } else {
      console.log('❌ 残高が0.001 ETH未満です。');
    }

    // Sepoliaの残高確認
    const sepoliaBalance = await sepoliaProvider.getBalance(address);
    console.log('\n=== Sepolia テストネット残高 ===');
    console.log(`アドレス: ${address}`);
    console.log(`残高: ${ethers.utils.formatEther(sepoliaBalance)} ETH`);
    
  } catch (error) {
    console.error('残高の確認に失敗しました:', error);
  }
}

checkBalance();