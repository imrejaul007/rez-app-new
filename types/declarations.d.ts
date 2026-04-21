// Module declarations for untyped npm packages and assets

declare module 'react-native-razorpay' {
  const RazorpayCheckout: any;
  export default RazorpayCheckout;
}

declare module '@/assets/images/deal.png' {
  const value: number;
  export default value;
}

// Expo package type declarations
// These packages ship their own .d.ts files but moduleResolution: bundler
// can't always resolve them through the exports field.
declare module '@expo/vector-icons';
declare module 'expo-linear-gradient';
declare module 'expo-font';
declare module 'expo-constants';
declare module 'expo-secure-store';
declare module 'expo-web-browser';
declare module 'expo-sharing';
declare module '@expo-google-fonts/poppins';
declare module '@expo-google-fonts/inter';
declare module 'expo-image-picker';
declare module 'expo-clipboard';
declare module 'expo-haptics';
declare module 'expo-document-picker';
declare module 'expo-image';
declare module 'expo-blur';
declare module 'expo-local-authentication';
