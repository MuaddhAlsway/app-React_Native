import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../components/Header'
import { BANNERS } from '@/assets/assets'
import { useCallback, useState } from 'react'
import { useRouter, useFocusEffect } from 'expo-router'
import { CATEGORIES } from "@/assets/constants";
import CategoryItem from '../../components/CategoryItem'
import { Product } from "../../../constants/types";
import ProductCard from '../../components/ProductCard'
import api from '../../../constants/api'
import axios from 'axios'

const { width } = Dimensions.get('window')

export default function Home() {
  const router = useRouter()
  const [activeBannerIndex, setActiveBannerIndex] = useState(0)
  const [product, setProduct] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const categories = [{ id: 'all', name: 'All', icon: 'grid' }, ...CATEGORIES]

  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useFocusEffect(useCallback(() => {
    let active = true
    const controller = new AbortController()
    const fetchProducts = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/products', {
          params: { limit: 4 }, signal: controller.signal,
        })
        if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Could not load products.')
        if (active) setProduct(data.data)
      } catch (error) {
        if (active) setError(axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : 'Could not load products.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void fetchProducts()
    return () => { active = false; controller.abort() }
  }, [retry]))

  return (
    <SafeAreaView className="flex-1" edges={['top']}>
      <Header title="Forever" showMenu showCart showLogo />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          {/* Banner Slider */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const slide = Math.ceil(
                e.nativeEvent.contentOffset.x /
                  e.nativeEvent.layoutMeasurement.width,
              )
              if (slide !== activeBannerIndex) {
                setActiveBannerIndex(slide)
              }
            }}
          >
            {BANNERS.map((banner, index) => (
              <View
                key={index}
                className="relative h-48 overflow-hidden rounded-xl bg-gray-200"
                style={{ width: width - 32 }}
              >
                <Image
                  source={{ uri: banner.image }}
                  className="h-full w-full"
                  resizeMode="cover"
                />

                <View className="absolute inset-0 bg-black/40" />

                <View className="absolute bottom-4 left-4 z-10">
                  <Text className="text-2xl font-bold text-white">
                    {banner.title}
                  </Text>

                  <Text className="text-sm font-medium text-white">
                    {banner.subtitle}
                  </Text>

                  <TouchableOpacity className="mt-2 self-start rounded-full bg-white px-4 py-2">
                    <Text className="text-xs font-bold text-primary">
                      Get Now
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          <View className="mt-3 flex-row justify-center gap-2">
            {BANNERS.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === activeBannerIndex
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </View>
        </View>

        {/* 1:19:59 */}
        {/* Categories */}
        <View className="mb-6">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-primary">Categories</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <CategoryItem
                key={cat.id}
                item={cat}
                isSelected={false}
                onPress={() =>
                  router.push({
                    pathname: '/shop',
                    params: { category: cat.id === 'all' ? '' : cat.id },
                  })
                }
              />
            ))}
          </ScrollView>
        </View>

        {/* Popular products */}
        <View className="mb-8">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-primary">Popular</Text>
            <TouchableOpacity onPress={() => router.push('/shop')}>
              <Text className="text-sm text-secondary">See All</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {product.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </View>
          )}
        </View>

        {/* Newsletter CTA */}
        <View className="mb-2 items-center rounded-2xl bg-gray-100 p-6">
          <Text className="mb-2 text-center text-2xl font-bold text-primary">
            Join the Revolution
          </Text>
          <Text className="mb-4 text-center text-secondary">
            Subscribe to our newsletter and get 10% off your first purchase
          </Text>
          <TouchableOpacity className="w-4/5 items-center rounded-full bg-primary py-3">
            <Text className="text-base font-medium text-white">
              Subscribe Now
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}