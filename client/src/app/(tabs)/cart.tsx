import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useCart } from '../../../context/CartContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../../components/Header'
import { ScrollView } from 'react-native-gesture-handler'
import CartItem from '../../../components/CartItem'

export default function Cart() {
  const { cartItem, cartTotal, removeFromCart, updateQuantity } = useCart()
  const router = useRouter()

  const shipping = 2
  const total = cartTotal + shipping

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="My Cart" showBack />

      {cartItem.length > 0 ? (
        <>
          <ScrollView showsHorizontalScrollIndicator={false}>
            {cartItem.map((item, index) => (
              <CartItem
                key={index}
                item={item}
                onRemove={() => removeFromCart(item.id, item.size)}
                onUpdateQuantity={(quantity) =>
                  updateQuantity(item.id, quantity, item.size)
                }
              />
            ))}
          </ScrollView>

          <View className="rounded-t-3xl bg-white p-4 shadow-sm">
            <View className="mb-2 flex-row justify-between">
              <Text className="text-secondary">Subtotal</Text>
              <Text className="font-bold text-primary">
                {cartTotal.toFixed(2)}
              </Text>
            </View>

            <View className="mb-2 flex-row justify-between">
              <Text className="text-secondary">Shipping</Text>
              <Text className="font-bold text-primary">
                {shipping.toFixed(2)}
              </Text>
            </View>

            <View className="mb-4 h-[1px] bg-border" />

            <View className="mb-6 flex-row justify-between">
              <Text className="text-lg font-bold text-primary">Total</Text>
              <Text className="text-lg font-bold text-primary">
                {total.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              className="items-center rounded-full bg-primary py-4"
              onPress={() => router.push('/checkout')}
            >
              <Text className="text-base font-bold text-white">Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-secondary">Your Cart is empty</Text>

          <TouchableOpacity
            className="mt-4"
            onPress={() => router.push('/')}
          >
            <Text className="font-bold text-primary">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}