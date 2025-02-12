import { ethers } from 'ethers';
import type { AIAgentWallet } from '../../typechain-types/AIAgentWallet';
import { AIAgentWallet__factory } from '../../typechain-types/factories/AIAgentWallet__factory';

export class AIWallet {
  private wallet: ethers.Wallet;
  private contract: AIAgentWallet;
  private provider: ethers.providers.JsonRpcProvider;

  constructor(
    privateKey: string,
    contractAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ) {
    this.provider = provider;
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.contract = AIAgentWallet__factory.connect(contractAddress, this.wallet);
  }

  static async create(): Promise<AIWallet> {
    try {
      // Sepoliaネットワークに接続
      if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
        throw new Error('Alchemy APIキーが設定されていません');
      }

      const provider = new ethers.providers.JsonRpcProvider(
        `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      );

      // ネットワークの確認
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) { // Sepolia chainId
        throw new Error('Sepoliaネットワークに接続できません');
      }

      // 新しいウォレットを作成
      const wallet = ethers.Wallet.createRandom().connect(provider);
      console.log('新しいウォレットを作成しました:');
      console.log('アドレス:', wallet.address);
      console.log('秘密鍵:', wallet.privateKey);
      console.log('ニーモニック:', wallet.mnemonic?.phrase);

      // スマートコントラクトをデプロイ
      console.log('コントラクトをデプロイ中...');
      const factory = new AIAgentWallet__factory(wallet);
      const dailyLimit = ethers.utils.parseEther('0.1'); // 0.1 ETH
      const contract = await factory.deploy(wallet.address, dailyLimit);
      console.log('デプロイ完了を待機中...');
      await contract.deployed();
      console.log('コントラクトアドレス:', contract.address);

      // 初期設定
      const tx = await contract.updateWhitelist(wallet.address, true);
      await tx.wait();
      console.log('ウォレットをホワイトリストに追加しました');

      return new AIWallet(wallet.privateKey, contract.address, provider);
    } catch (error) {
      console.error('AIウォレットの作成に失敗:', error);
      throw new Error('AIウォレットの作成に失敗しました: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async executeTransaction(to: string, value: string): Promise<ethers.ContractTransaction> {
    const valueWei = ethers.utils.parseEther(value);
    return await this.contract.executeTransaction(to, valueWei);
  }

  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.contract.address);
    return ethers.utils.formatEther(balance);
  }

  async getDailyLimit(): Promise<string> {
    const limit = await this.contract.dailyLimit();
    return ethers.utils.formatEther(limit);
  }

  async getDailySpent(): Promise<string> {
    const spent = await this.contract.dailySpent();
    return ethers.utils.formatEther(spent);
  }

  async isLocked(): Promise<boolean> {
    return await this.contract.isLocked();
  }

  async toggleLock(): Promise<ethers.ContractTransaction> {
    return await this.contract.toggleLock();
  }

  async updateWhitelist(account: string, status: boolean): Promise<ethers.ContractTransaction> {
    return await this.contract.updateWhitelist(account, status);
  }

  getAddress(): string {
    return this.contract.address;
  }

  async emergencyWithdraw(): Promise<ethers.ContractTransaction> {
    return await this.contract.emergencyWithdraw();
  }

  getPrivateKey(): string {
    return this.wallet.privateKey;
  }
}
