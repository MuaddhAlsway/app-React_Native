import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native'
import { useWishlist } from '../../../context/WishlistContext'
import { dummyProducts } from '@/assets/assets'
import { useCart } from '../../../context/CartContext'
import { SafeAreaView } from 'react-native-safe-area-context'
import { COLORS } from '@/assets/constants'
import { ScrollView } from 'react-native-gesture-handler'
import { Product } from '@/assets/constants/types'
import { Ionicons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'

const { width } = Dimensions.get('window')

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>()
  const productId = Array.isArray(id) ? id[0] : id
  const router = useRouter()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const { addToCart, itemCount } = useCart()
  const { toggleWishlist, isInWishlist } = useWishlist()

  useEffect(() => {
    const fetchProduct = async () => {
      const foundProduct = dummyProducts.find(
        (item) => item._id === productId,
      )
      setProduct(foundProduct ?? null)
      setLoading(false)
    }

    fetchProduct()
  }, [productId])

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    )
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center">
        <Text>Product not found</Text>
      </SafeAreaView>
    )
  }

  const isLiked = isInWishlist(product._id)

  const handleAddToCart = () => {
    if (!selectedSize) {
      Toast.show({
        type: 'info',
        text1: 'No Size Selected',
        text2: 'Please select a size',
      })
      return
    }

    addToCart(product, selectedSize)
  }

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(tabs)')
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image carousel */}
        <View className="relative mb-6 h-[450px] bg-gray-100">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const slide = Math.round(
                event.nativeEvent.contentOffset.x /
                  event.nativeEvent.layoutMeasurement.width,
              )
              setActiveImageIndex(slide)
            }}
          >
            {product.images?.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={{ width, height: 450 }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Header actions */}
          <View className="absolute left-4 right-4 top-12 z-10 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleGoBack}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/80"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={COLORS.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleWishlist(product)}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/80"
              accessibilityRole="button"
              accessibilityLabel={
                isLiked ? 'Remove from wishlist' : 'Add to wishlist'
              }
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? COLORS.accent : COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Pagination dots */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
            {product.images?.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === activeImageIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </View>
        </View>

        {/* Product info */}
        <View className="px-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="mr-4 flex-1 text-2xl font-bold text-primary">
              {product.name}
            </Text>
          </View>

          <View className="mb-2 flex-row items-start">
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text className="ml-1 text-sm font-bold">4.6</Text>
            <Text className="ml-1 text-xs text-secondary">(85)</Text>
          </View>

          {/* Price */}
          <Text className="mb-6 text-2xl font-bold text-primary">
            ${product.price.toFixed(2)}
          </Text>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <>
              <Text className="mb-3 text-base font-bold text-primary">
                Size
              </Text>

              <View className="mb-6 flex-row flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    className={`h-12 w-12 items-center justify-center rounded-full border ${
                      selectedSize === size
                        ? 'border-primary bg-primary'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedSize === size
                          ? 'text-white'
                          : 'text-primary'
                      }`}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Description */}
          <Text className="mb-2 text-base font-bold text-primary">
            Description
          </Text>

          <Text className="mb-6 leading-6 text-secondary">
            {product.description}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-gray-100 bg-white p-4">
        <TouchableOpacity
          onPress={handleAddToCart}
          className="w-4/5 flex-row items-center justify-center rounded-full bg-primary py-4 shadow-lg"
        >
          <Ionicons name="bag-outline" size={20} color="white" />
          <Text className="ml-2 text-base font-bold text-white">
            Add to Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart')}
          className="relative w-1/5 flex-row justify-center py-3"
        >
          <Ionicons name="cart-outline" size={24} />

          <View className="absolute right-4 top-2 z-10 h-4 w-4 items-center justify-center rounded-full bg-black">
            <Text className="text-[9px] text-white">{itemCount}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}