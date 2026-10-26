import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useCart } from '../../context/CartContext'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import axios from 'axios'
import api from '../../constants/api'
import { Address } from '@/assets/constants/types'
import Toast from 'react-native-toast-message'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '@/assets/constants'
import Header from '../components/Header'
import { ScrollView } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'

export default function Checkout() {
  const { cartTotal, itemCount, isLoading: cartLoading, error: cartError, refreshCart } = useCart()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe'>('cash')

  const shipping = 2.0
  const tax = 0
  const total = cartTotal + shipping + tax

  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const currentUser = useRef(userId)
  currentUser.current = userId
  const submitting = useRef(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useFocusEffect(useCallback(() => {
    if (!isLoaded) return
    let active = true
    const controller = new AbortController()
    setPageLoading(true)
    setSelectedAddress(null)
    setError('')
    const fetchAddress = async () => {
      try {
        if (!isSignedIn) throw new Error('Sign in to check out.')
        const token = await getTokenRef.current()
        if (!token) throw new Error('Please sign in again.')
        const { data } = await api.get('/addresses', { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal })
        if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Could not load addresses.')
        if (active) setSelectedAddress(data.data.find((address: Address) => address.isDefault) || data.data[0] || null)
      } catch (cause) {
        if (active) setError(axios.isAxiosError(cause) ? cause.response?.data?.message || cause.message : cause instanceof Error ? cause.message : 'Could not load addresses.')
      } finally { if (active) setPageLoading(false) }
    }
    void fetchAddress()
    return () => { active = false; controller.abort() }
  }, [isLoaded, isSignedIn, userId, retry]))

  const handlePlaceOrder = async () => {
    if (submitting.current || cartLoading) return
    if (!selectedAddress || itemCount < 1 || cartError) {
      Toast.show({ type: 'error', text1: 'Cannot place order', text2: cartError || (itemCount < 1 ? 'Your cart is empty.' : 'Please add a shipping address.') })
      return
    }
    if (paymentMethod !== 'cash') {
      Toast.show({ type: 'info', text1: 'Card payment unavailable', text2: 'Choose cash on delivery.' })
      return
    }
    const owner = userId
    submitting.current = true
    setLoading(true)
    let created = false
    try {
      const token = await getTokenRef.current()
      if (!token || currentUser.current !== owner) throw new Error('Please sign in again.')
      const { data } = await api.post('/orders', { addressId: selectedAddress._id, paymentMethod: 'cash' }, { headers: { Authorization: 'Bearer ' + token } })
      if (!data.success || !data.data?._id) throw new Error(data.message || 'Could not place order.')
      created = true
      if (currentUser.current !== owner) return
      // The server already cleared the cart as part of checkout. Only reload it.
      await refreshCart()
      Toast.show({ type: 'success', text1: 'Order placed', text2: 'Your cash-on-delivery order was saved.' })
      router.replace('/orders')
    } catch (cause) {
      Toast.show({ type: 'error', text1: created ? 'Order saved; refresh your orders' : 'Could not place order', text2: axios.isAxiosError(cause) ? cause.response?.data?.message || cause.message : cause instanceof Error ? cause.message : 'Please check your orders before retrying.' })
    } finally { submitting.current = false; setLoading(false) }
  }

  if (pageLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Checkout" showBack />
      {error ? <View className="items-center px-4 py-3"><Text className="mb-2 text-red-600">{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text className="font-bold text-primary">Retry</Text></TouchableOpacity></View> : null}
      {cartError ? <Text className="px-4 py-2 text-red-600">{cartError}</Text> : null}

      <ScrollView className="mt-4 flex-1 px-4">
        {/* Address Action */}
        <Text className="mb-4 text-lg font-bold text-primary">
          Shipping Address
        </Text>

        {selectedAddress ? (
          <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-bold">
                {selectedAddress.type}
              </Text>

              <TouchableOpacity disabled={loading} onPress={() => router.push('/addresses')}>
                <Text>Change</Text>
              </TouchableOpacity>
            </View>

            <Text className="leading-5 text-secondary">
              {selectedAddress.street}, {selectedAddress.city}
              {'\n'}
              {selectedAddress.state} {selectedAddress.zipCode}
              {'\n'}
              {selectedAddress.country}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/addresses')}
            className="mb-6 items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-white p-6"
          >
            <Text className="font-bold text-primary">Add Address</Text>
          </TouchableOpacity>
        )}

        {/* Payment section */}
        <Text className="mb-4 text-lg font-bold text-primary">
          Payment Method
        </Text>

        {/* Cash on Delivery option */}
        <TouchableOpacity
          onPress={() => setPaymentMethod('cash')}
          className={`mb-4 flex-row items-center rounded-xl border-2 bg-white p-4 ${
            paymentMethod === 'cash'
              ? 'border-primary'
              : 'border-transparent'
          }`}
        >
          <Ionicons
            name="cash-outline"
            size={24}
            color={COLORS.primary}
          />

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-primary">
              Cash on Delivery
            </Text>
            <Text className="mt-1 text-xs text-secondary">
              Pay when you receive the order
            </Text>
          </View>

          {paymentMethod === 'cash' && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={COLORS.primary}
            />
          )}
        </TouchableOpacity>

        {/* Stripe option */}
        <TouchableOpacity
          onPress={() => setPaymentMethod('stripe')}
          className={`mb-4 flex-row items-center rounded-xl border-2 bg-white p-4 ${
            paymentMethod === 'stripe'
              ? 'border-primary'
              : 'border-transparent'
          }`}
        >
          <Ionicons
            name="card-outline"
            size={24}
            color={COLORS.primary}
          />

          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-primary">
              Pay with Card
            </Text>
            <Text className="mt-1 text-xs text-secondary">
              Credit or Debit Card
            </Text>
          </View>

          {paymentMethod === 'stripe' && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={COLORS.primary}
            />
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Order Summary   */}
      <View className='p-4 bg-white shadow-lg border-t border-gray-100'>
        <Text className='text-lg font-bold text-primary mb-4'>
            Order Summary
        </Text>

        {/* Subtotal */}
            <View className='flex-row justify-between mb-2'>
                <Text className='text-secondary'>Subtotal</Text>
                <Text className='font-bold'>${cartTotal.toFixed(2)}</Text>
            </View>
         {/* Shipping */}
            <View className='flex-row justify-between mb-2'>
                <Text className='text-secondary'>Shipping</Text>
                <Text className='font-bold'>${shipping.toFixed(2)}</Text>
            </View>
            

            {/* Tax */}
              <View className='flex-row justify-between mb-4'>
                <Text className='text-secondary'>Tax</Text>
                <Text className='font-bold'>${tax.toFixed(2)}</Text>
            </View>

              {/* Total */}
              <View className='flex-row justify-between mb-6'>
                <Text className='text-primary text-xl font-bold'>Total</Text>
                <Text className='font-bold text-primary text-xl '>${total.toFixed(2)}</Text>
            </View>
            {/* Place Order Button */}
            <TouchableOpacity className={`p-4 rounded-xl items-center ${loading ? 'bg-gray-400':'bg-primary'}`}
            onPress={handlePlaceOrder} disabled={loading || cartLoading || !!cartError || !!error || !selectedAddress || itemCount < 1}>
                {loading ? <ActivityIndicator color='white'/> :  
                <Text className='text-white font-bold text-lg'>Place Order</Text>
                }
            </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}