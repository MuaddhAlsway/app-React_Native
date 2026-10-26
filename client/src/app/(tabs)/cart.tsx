import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { useCart } from '../../../context/CartContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../components/Header'
import { ScrollView } from 'react-native-gesture-handler'
import CartItem from '../../components/CartItem'

export default function Cart() {
  const { cartItem, cartTotal, removeFromCart, updateQuantity, isLoading, error, refreshCart } = useCart()
  const router = useRouter()

  const [pendingRemove, setPendingRemove] = useState<{ id: string; productId: string; name: string; size: string } | null>(null)
  const [removing, setRemoving] = useState(false)
  const [attemptedRemove, setAttemptedRemove] = useState(false)

  useEffect(() => {
    if (pendingRemove && !cartItem.some(item => item.id === pendingRemove.id)) setPendingRemove(null)
  }, [cartItem, pendingRemove])

  const confirmRemove = async () => {
    if (!pendingRemove || removing || isLoading) return
    setRemoving(true)
    setAttemptedRemove(true)
    try { await removeFromCart(pendingRemove.productId, pendingRemove.size) }
    finally { setRemoving(false) }
  }

  const shipping = 2
  const total = cartTotal + shipping

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="My Cart" showBack />

      {error ? <View className="items-center px-4 py-3"><Text className="text-red-600">{error}</Text><TouchableOpacity disabled={isLoading} onPress={() => { void refreshCart() }}><Text className="mt-2 font-bold text-primary">Retry</Text></TouchableOpacity></View> : null}
      {isLoading ? <View className="items-center py-3"><ActivityIndicator /><Text className="mt-2 text-secondary">Updating cart…</Text></View> : null}
      {cartItem.length > 0 ? (
        <>
          <ScrollView showsHorizontalScrollIndicator={false}>
            {cartItem.map((item, index) => (
              <CartItem
                key={item.id}
                item={item}
                onRemove={() => {
                  if (isLoading || removing) return
                  setAttemptedRemove(false)
                  setPendingRemove({ id: item.id, productId: item.productId, name: item.product.name, size: item.size })
                }}
                onUpdateQuantity={(quantity) =>
                  updateQuantity(item.productId, quantity, item.size)
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
              disabled={isLoading || !!error}
            >
              <Text className="text-base font-bold text-white">Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-secondary">{isLoading ? 'Loading your cart…' : error ? 'Cart unavailable' : 'Your Cart is empty'}</Text>

          <TouchableOpacity
            className="mt-4"
            onPress={() => router.push('/')}
          >
            <Text className="font-bold text-primary">Start Shopping</Text>
          </TouchableOpacity>
        </View>
      )}
      <Modal
        visible={pendingRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!removing) setPendingRemove(null) }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6" accessibilityViewIsModal>
            <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-primary">Remove from cart?</Text>
            <Text className="mb-5 text-secondary">Remove “{pendingRemove?.name}”{pendingRemove?.size ? ' (size ' + pendingRemove.size + ')' : ''} from your cart?</Text>
            {attemptedRemove && error ? <Text accessibilityRole="alert" className="mb-4 text-red-600">{error}</Text> : null}
            <View className="flex-row justify-end">
              <TouchableOpacity
                accessibilityRole="button"
                disabled={removing}
                onPress={() => setPendingRemove(null)}
                className="mr-3 rounded-xl bg-gray-100 px-5 py-3"
              ><Text className="font-semibold text-primary">Cancel</Text></TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={removing || isLoading}
                onPress={() => { void confirmRemove() }}
                className={"min-w-24 items-center rounded-xl bg-red-600 px-5 py-3 " + (removing || isLoading ? "opacity-60" : "")}
              >{removing ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Remove</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}