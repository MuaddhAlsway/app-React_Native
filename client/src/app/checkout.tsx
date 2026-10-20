import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useCart } from '../../context/CartContext'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { dummyAddress } from '@/assets/assets'
import { Address } from '@/assets/constants/types'
import Toast from 'react-native-toast-message'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '@/assets/constants'
import Header from '../components/Header'
import { ScrollView } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'

export default function Checkout() {
  const { cartTotal } = useCart()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [seletectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe'>('cash')

  const shipping = 2.0
  const tax = 0
  const total = cartTotal + shipping + tax

  const fetchAddress = async () => {
    const addrList = dummyAddress

    if (addrList.length > 0) {
      const def =
        addrList.find((address: any) => address.isDefault) || addrList[0]
      setSelectedAddress(def as Address)
    }

    setPageLoading(false)
  }

  const handlePlaceOrder = async () => {
    if (!seletectedAddress) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please add a shipping address',
      })
      return
    }

    if (paymentMethod === 'stripe') {
      Toast.show({
        type: 'error',
        text1: 'Info',
        text2: 'Stripe not implemented yet',
      })
      return
    }

    router.replace('/orders')
  }

  useEffect(() => {
    fetchAddress()
  }, [])

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

      <ScrollView className="mt-4 flex-1 px-4">
        {/* Address Action */}
        <Text className="mb-4 text-lg font-bold text-primary">
          Shipping Address
        </Text>

        {seletectedAddress ? (
          <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-bold">
                {seletectedAddress.type}
              </Text>

              <TouchableOpacity onPress={() => router.push('/addresses')}>
                <Text>Change</Text>
              </TouchableOpacity>
            </View>

            <Text className="leading-5 text-secondary">
              {seletectedAddress.street}, {seletectedAddress.city}
              {'\n'}
              {seletectedAddress.state} {seletectedAddress.zipCode}
              {'\n'}
              {seletectedAddress.country}
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
                <Text className='text-secondary'>Subtotal</Text>
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
            onPress={handlePlaceOrder} disabled={loading}>
                {loading ? <ActivityIndicator color='white'/> :  
                <Text className='text-white font-bold text-lg'>Place Order</Text>
                }
            </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}