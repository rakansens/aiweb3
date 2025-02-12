import { ethers } from 'ethers';
import { Network, Alchemy, AssetTransfersCategory } from 'alchemy-sdk';
import type { AIAgentWallet } from '../../typechain-types/AIAgentWallet';
import { AIAgentWallet__factory } from '../../typechain-types/factories/AIAgentWallet__factory';

const settings = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA
};

export class AIWallet {
  private wallet: ethers.Wallet;
  private contract: AIAgentWallet;
  private provider: ethers.providers.JsonRpcProvider;
  private alchemy: Alchemy;

  private static providerOptions = {
    polling: false,
    pollingInterval: 0,
    staticNetwork: true, // ネットワーク変更の監視を無効化
    skipGetNetwork: true, // 初期のネットワークチェックをスキップ
    batchRequests: true, // リクエストをバッチ化
    cacheTimeout: 300000, // 5分のキャッシュ
  };

  constructor(
    privateKey: string,
    contractAddress: string,
    provider: ethers.providers.JsonRpcProvider
  ) {
    // プロバイダーの設定を最適化
    Object.assign(provider, AIWallet.providerOptions);
    
    this.provider = provider;
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.contract = AIAgentWallet__factory.connect(contractAddress, this.wallet);
    
    // Alchemyインスタンスの設定を最適化
    this.alchemy = new Alchemy({
      ...settings,
      maxRetries: 0,
      requestTimeout: 30000
    });

    // チェーンIDをキャッシュ
    this.provider.getNetwork().then(network => {
      this.provider._network = network;
    }).catch(console.error);

    // プロバイダーの設定を最適化
    if (this.provider instanceof ethers.providers.JsonRpcProvider) {
      // ポーリングを完全に無効化
      this.provider.polling = false;
      this.provider.pollingInterval = 0;

      // 不要なイベントリスナーを削除
      this.provider.removeAllListeners();
      // エラーハンドリングのみ設定
      this.provider.on('error', console.error);

      // プロバイダーのオプションを設定
      this.provider.connection.headers = {
        ...this.provider.connection.headers,
        'Cache-Control': 'max-age=300' // 5分のキャッシュ
      };
    }
  }

  private lastCheckedBlock: number = 0;
  private transferCache: any = null;
  private transferCacheTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  // トランザクション履歴の取得(最適化版)
  async getTransactionHistory(): Promise<any> {
    const now = Date.now();
    
    // キャッシュが有効な場合はキャッシュを返す
    if (this.transferCache && (now - this.transferCacheTime) < this.CACHE_DURATION) {
      return this.transferCache;
    }

    try {
      // 最新のブロック番号を取得
      const latestBlock = await this.provider.getBlockNumber();
      
      // 前回チェックしたブロックから最新までのみ取得
      const fromBlock = this.lastCheckedBlock || latestBlock - 100; // 初回は100ブロック分
      
      const transfers = await this.alchemy.core.getAssetTransfers({
        fromAddress: this.contract.address,
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${latestBlock.toString(16)}`,
        category: [
          AssetTransfersCategory.EXTERNAL,
          AssetTransfersCategory.INTERNAL,
          AssetTransfersCategory.ERC20,
          AssetTransfersCategory.ERC721,
          AssetTransfersCategory.ERC1155
        ],
      });

      // キャッシュを更新
      this.transferCache = transfers;
      this.transferCacheTime = now;
      this.lastCheckedBlock = latestBlock;

      return transfers;
    } catch (error) {
      console.error('Failed to fetch transfer history:', error);
      return this.transferCache || { transfers: [] };
    }
  }

  // トークン残高の取得
  async getTokenBalances(): Promise<any> {
    return await this.alchemy.core.getTokenBalances(this.contract.address);
  }

  private eventListeners: { [key: string]: (...args: any[]) => void } = {};

  // イベントの監視(最適化版)
  async subscribeToEvents(callback: (event: any) => void): Promise<void> {
    // 既存のリスナーをクリーンアップ
    this.unsubscribeFromEvents();

    // コントラクトのイベントをフィルターで監視(最適化)
    const filter = {
      address: this.contract.address,
      topics: [
        [
          ethers.utils.id("TransactionExecuted(address,uint256)"),
          ethers.utils.id("WalletLocked(bool)")
        ]
      ],
      fromBlock: 'latest' // 最新のブロックのみを監視
    };

    // イベント処理用の共通ハンドラ
    const eventHandler = async (log: any) => {
      try {
        // イベントの種類をトピックから判断
        const eventHash = log.topics[0];
        const transactionExecutedHash = ethers.utils.id("TransactionExecuted(address,uint256)");
        const walletLockedHash = ethers.utils.id("WalletLocked(bool)");

        if (eventHash === transactionExecutedHash) {
          const decoded = ethers.utils.defaultAbiCoder.decode(
            ['address', 'uint256'],
            ethers.utils.hexDataSlice(log.data, 0)
          );
          callback({
            type: "transaction",
            to: decoded[0],
            value: ethers.utils.formatEther(decoded[1]),
            event: log
          });
        } else if (eventHash === walletLockedHash) {
          const decoded = ethers.utils.defaultAbiCoder.decode(
            ['bool'],
            ethers.utils.hexDataSlice(log.data, 0)
          );
          callback({
            type: "lock",
            locked: decoded[0],
            event: log
          });
        }
      } catch (error) {
        console.error('Failed to parse event:', error);
      }
    };

    // フィルターを使用してイベントを監視
    this.provider.on(filter, eventHandler);
    this.eventListeners["contractEvents"] = eventHandler;
  }

  // イベントの監視解除
  unsubscribeFromEvents(): void {
    Object.entries(this.eventListeners).forEach(([event, handler]) => {
      this.contract.off(event, handler);
    });
    this.eventListeners = {};
  }

  // 最新ブロックの取得
  async getLatestBlock(): Promise<any> {
    return await this.alchemy.core.getBlock("latest");
  }

  static async create(): Promise<AIWallet> {
    try {
      // Sepoliaネットワークに接続
      if (!process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || !process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY) {
        throw new Error('必要な環境変数が設定されていません');
      }

      const provider = new ethers.providers.JsonRpcProvider(
        `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
      );

      // ネットワークの確認
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) { // Sepolia chainId
        throw new Error('Sepoliaネットワークに接続できません');
      }

      // 新しいユーザーウォレットを作成
      const userWallet = ethers.Wallet.createRandom().connect(provider);
      console.log('新しいウォレットを作成しました:');
      console.log('アドレス:', userWallet.address);
      console.log('秘密鍵:', userWallet.privateKey);
      console.log('ニーモニック:', userWallet.mnemonic?.phrase);

      // 管理者ウォレットを設定
      if (!process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY) {
        throw new Error('管理者の秘密鍵が設定されていません');
      }
      const adminWallet = new ethers.Wallet(process.env.NEXT_PUBLIC_ADMIN_PRIVATE_KEY, provider);
      console.log('管理者ウォレットを使用:', adminWallet.address);

      // スマートコントラクトをデプロイ (管理者ウォレットで)
      console.log('コントラクトをデプロイ中...');
      const factory = new AIAgentWallet__factory(adminWallet);
      const dailyLimit = ethers.utils.parseEther('0.1'); // 0.1 ETH
      
      // デプロイ前にガス代を見積もり
      const deployTx = factory.getDeployTransaction(userWallet.address, dailyLimit);
      const deploymentGas = await factory.signer.estimateGas(deployTx as ethers.utils.Deferrable<ethers.providers.TransactionRequest>);
      console.log('推定ガス代:', ethers.utils.formatEther(deploymentGas), 'ETH');

      // コントラクトをデプロイ
      const contract = await factory.deploy(userWallet.address, dailyLimit, {
        gasLimit: deploymentGas.mul(120).div(100) // 20%のバッファを追加
      });
      console.log('デプロイ完了を待機中...');
      await contract.deployed();
      console.log('コントラクトアドレス:', contract.address);

      // 初期設定 (管理者ウォレットで)
      const tx = await contract.connect(adminWallet).updateWhitelist(userWallet.address, true);
      await tx.wait();
      console.log('ウォレットをホワイトリストに追加しました');

      // ユーザーウォレットで接続したインスタンスを返す
      return new AIWallet(userWallet.privateKey, contract.address, provider);
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
