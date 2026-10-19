import { View, Text, TouchableOpacity } from 'react-native'
import { useWishlist } from '../../../context/WishlistContext'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import Header from '../../../components/Header'
import ProductCard from '../../../components/ProductCard'

export default function Favorite() {
  const { wishlist } = useWishlist()
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Wishlist" showMenu showCart />

      {wishlist.length > 0 ? (
        <ScrollView
          className="mt-4 flex-1 px-4"
          showsHorizontalScrollIndicator={false}
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
            Your Wishlist is empty
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