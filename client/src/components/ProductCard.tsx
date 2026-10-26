import { ProductCardProps } from '@/assets/constants/types'
import { COLORS } from '@/assets/constants'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { Image, View, TouchableOpacity, Text } from 'react-native'
import { useWishlist } from '../../context/WishlistContext'

const ProductCard = ({ product }: ProductCardProps) => {
  const { toggleWishlist, isInWishlist, loading: wishlistLoading } = useWishlist()
  const isLiked = isInWishlist(product._id)

  return (
    <View className="relative mb-4 w-[48%] overflow-hidden rounded-lg bg-white">
      <Link href={`/product/${product._id}`} asChild>
        <TouchableOpacity>
          <View className="relative h-56 w-full bg-gray-100">
            <Image
              source={{ uri: product.images?.[0] ?? '' }}
              className="h-full w-full"
              resizeMode="cover"
            />

            {product.isFeatured && (
              <View className="absolute left-2 top-2 rounded bg-black px-2 py-1">
                <Text className="text-xs font-bold uppercase text-white">
                  Featured
                </Text>
              </View>
            )}
          </View>

          <View className="p-3">
            <View className="mb-1 flex-row items-center">
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text className="ml-1 text-xs text-secondary">4.6</Text>
            </View>

            <Text
              className="mb-1 text-sm font-medium text-primary"
              numberOfLines={1}
            >
              {product.name}
            </Text>

            <Text className="text-base font-bold text-primary">
              ${product.price.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity
        className="absolute right-2 top-2 z-10 rounded-full bg-white p-2 shadow-sm"
        disabled={wishlistLoading}
        accessibilityRole="button"
        accessibilityLabel={isLiked ? "Remove from wishlist" : "Add to wishlist"}
        onPress={() => { void toggleWishlist(product) }}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={20}
          color={isLiked ? COLORS.accent : COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  )
}

export default ProductCard
