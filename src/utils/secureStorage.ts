import { Buffer } from 'buffer';
import { EncryptedWallet, WalletSecurityInfo } from '../types/wallet';

// AES暗号化のためのユーティリティ関数
export const secureStorage = {
  // メモリ内の一時ストレージ（セッション中のみ）
  temporaryStorage: new Map<string, any>(),

  // AES-GCM暗号化
  async encrypt(data: string, password: string): Promise<{ encrypted: string; iv: string; salt: string }> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const passwordBuffer = new TextEncoder().encode(password);
    const key = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const encodedData = new TextEncoder().encode(data);
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      aesKey,
      encodedData
    );
    
    return {
      encrypted: Buffer.from(encryptedContent).toString('base64'),
      iv: Buffer.from(iv).toString('base64'),
      salt: Buffer.from(salt).toString('base64')
    };
  },

  // AES-GCM復号化
  async decrypt(encryptedData: string, iv: string, salt: string, password: string): Promise<string> {
    const passwordBuffer = new TextEncoder().encode(password);
    const key = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: Buffer.from(salt, 'base64'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: Buffer.from(iv, 'base64')
      },
      aesKey,
      Buffer.from(encryptedData, 'base64')
    );
    
    return new TextDecoder().decode(decryptedContent);
  },

  // ウォレット情報の安全な保存
  async storeWallet(walletInfo: WalletSecurityInfo, password: string): Promise<void> {
    const { encrypted: encryptedPrivateKey, iv: privateKeyIv, salt: privateKeySalt } = 
      await this.encrypt(walletInfo.privateKey, password);
    
    const { encrypted: encryptedMnemonic, iv: mnemonicIv, salt: mnemonicSalt } = 
      await this.encrypt(walletInfo.mnemonic, password);

    const encryptedWallet: EncryptedWallet = {
      encryptedPrivateKey,
      encryptedMnemonic,
      iv: privateKeyIv, // 同じIVを使用
      salt: privateKeySalt // 同じソルトを使用
    };

    // ローカルストレージに暗号化されたデータを保存
    localStorage.setItem('encryptedWallet', JSON.stringify(encryptedWallet));
  },

  // ウォレット情報の復号化
  async retrieveWallet(password: string): Promise<WalletSecurityInfo> {
    const encryptedWalletString = localStorage.getItem('encryptedWallet');
    if (!encryptedWalletString) {
      throw new Error('ウォレットが見つかりません');
    }

    const encryptedWallet: EncryptedWallet = JSON.parse(encryptedWalletString);
    
    const privateKey = await this.decrypt(
      encryptedWallet.encryptedPrivateKey,
      encryptedWallet.iv,
      encryptedWallet.salt,
      password
    );
    
    const mnemonic = await this.decrypt(
      encryptedWallet.encryptedMnemonic,
      encryptedWallet.iv,
      encryptedWallet.salt,
      password
    );

    return {
      privateKey,
      mnemonic,
      password
    };
  },

  // セッション中のみの一時保存
  setTemporary(key: string, value: any): void {
    this.temporaryStorage.set(key, value);
  },

  getTemporary(key: string): any {
    return this.temporaryStorage.get(key);
  },

  clearTemporary(key: string): void {
    this.temporaryStorage.delete(key);
  },

  // すべての一時データをクリア
  clearAllTemporary(): void {
    this.temporaryStorage.clear();
  }
};
