// Module declarations for untyped npm packages and assets

declare module 'react-native-razorpay' {
  const RazorpayCheckout: any;
  export default RazorpayCheckout;
}

declare module '@/assets/images/deal.png' {
  const value: number;
  export default value;
}

declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA1 = 'SHA-1',
    SHA256 = 'SHA-256',
    MD5 = 'MD-5',
  }
  export enum CryptoEncoding {
    HEX = 'hex',
    BASE64 = 'base64',
  }
  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm,
    content: string,
    options?: { encoding?: CryptoEncoding }
  ): Promise<string>;
}

declare module 'uuid' {
  export function v4(): string;
}
