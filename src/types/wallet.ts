export interface WalletSecurityInfo {
  mnemonic: string;
  privateKey: string;
  password?: string;
}

export interface WalletImportOptions {
  privateKey?: string;
  mnemonic?: string;
  keystore?: string;
  password?: string;
}

export interface WalletCreationStep {
  step: 'generate' | 'backup' | 'verify' | 'secure' | 'complete';
  title: string;
  description: string;
}

export interface EncryptedWallet {
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
  iv: string;
  salt: string;
}
