import Toast from 'react-native-toast-message'
import { CartProvider } from '../../context/CartContext'
import { WishlistProvider } from '../../context/WishlistContext'
import '../global.css'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY')
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider
        publishableKey={publishableKey}
        tokenCache={tokenCache}
      >
        <CartProvider>
          <WishlistProvider>
            <Stack screenOptions={{ headerShown: false }} />
            <Toast />
          </WishlistProvider>
        </CartProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  )
}