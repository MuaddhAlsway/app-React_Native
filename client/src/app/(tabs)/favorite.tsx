import { View, Text, TouchableOpacity, ActivityIndicator, RefreshControl, AppState } from 'react-native'
import { useWishlist } from '../../../context/WishlistContext'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import Header from '../../components/Header'
import ProductCard from '../../components/ProductCard'

export default function Favorite() {
  const { wishlist, loading, error, refreshWishlist } = useWishlist()
  const router = useRouter()

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    try { await refreshWishlist() } finally { setRefreshing(false) }
  }

  useFocusEffect(useCallback(() => {
    void refreshWishlist()
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshWishlist()
    }, 15000)
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshWishlist()
    })
    return () => { clearInterval(timer); subscription.remove() }
  }, [refreshWishlist]))

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Wishlist" showMenu showCart />

      {error ? <View className="items-center px-4 py-3"><Text className="mb-2 text-red-600">{error}</Text><TouchableOpacity disabled={loading} onPress={() => { void refreshWishlist() }}><Text className="font-bold text-primary">Retry</Text></TouchableOpacity></View> : null}
      {loading ? <ActivityIndicator className="my-4" /> : null}
      {!loading && !error ? <Text className="px-4 pt-3 text-secondary">{wishlist.length} saved {wishlist.length === 1 ? 'product' : 'products'}</Text> : null}
      {wishlist.length > 0 ? (
        <ScrollView
          className="mt-4 flex-1 px-4"
          showsHorizontalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void onRefresh() }} />}
        >
          <View className="flex-row flex-wrap justify-between">
            {wishlist.map((item) => (
              <ProductCard key={item._id} product={item} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-secondary">
            {loading ? 'Loading wishlist…' : error ? 'Wishlist unavailable' : 'Your Wishlist is empty'}
          </Text>

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