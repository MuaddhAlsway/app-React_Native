import api from '../../constants/api'
import axios from 'axios'
import { useFocusEffect } from 'expo-router'
import { Product } from '@/assets/constants/types'
import { useCallback, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../components/Header'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/assets/constants'
import ProductCard from '../components/ProductCard'

export default function Shop() {
  const [product, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const page = useRef(0)
  const hasMore = useRef(true)
  const request = useRef<AbortController | null>(null)

  const fetchProducts = useCallback(async (pageNumber = 1, refresh = false) => {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setError('')
    if (pageNumber === 1) {
      if (refresh) setRefreshing(true)
      else setLoading(true)
    } else setLoadingMore(true)
    try {
      const { data } = await api.get('/products', {
        params: { page: pageNumber, limit: 10 }, signal: controller.signal,
      })
      if (!data.success || !Array.isArray(data.data) || !data.pagination) throw new Error(data.message || 'Could not load products.')
      if (request.current !== controller) return
      setProducts(previous => {
        const combined: Product[] = pageNumber === 1 ? data.data : [...previous, ...data.data]
        return [...new Map(combined.map(product => [product._id, product])).values()]
      })
      hasMore.current = pageNumber < data.pagination.pages
      page.current = pageNumber
    } catch (error) {
      if (request.current === controller) setError(axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : 'Could not load products.')
    } finally {
      if (request.current === controller) {
        request.current = null
        setLoading(false)
        setLoadingMore(false)
        setRefreshing(false)
      }
    }
  }, [])

  const loadMore = () => {
    if (!request.current && !error && hasMore.current && page.current > 0) void fetchProducts(page.current + 1)
  }

  useFocusEffect(useCallback(() => {
    page.current = 0
    hasMore.current = true
    void fetchProducts(1)
    return () => { request.current?.abort(); request.current = null }
  }, [fetchProducts]))

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Shop" showBack showCart />

      <View className="mx-4 my-2 mb-3 flex-row gap-2">
        {/* Search bar */}
        <View className="flex-1 flex-row items-center rounded-xl border border-gray-100 bg-white">
          <Ionicons
            name="search"
            className="ml-4"
            size={20}
            color={COLORS.secondary}
          />
          <TextInput
            className="ml-2 flex-1 px-4 py-3 text-primary"
            placeholder="Search product..."
            returnKeyLabel="search"
            placeholderTextColor={COLORS.secondary}
          />
        </View>

        {/* Filter icon */}
        <TouchableOpacity className="h-12 w-12 items-center justify-center rounded-xl bg-gray-800">
          <Ionicons name="options-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={product}
          refreshing={refreshing}
          onRefresh={() => { void fetchProducts(1, true) }}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => <ProductCard product={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : error ? (
              <View className="items-center py-4">
                <Text className="mb-3 text-secondary">{error}</Text>
                <TouchableOpacity accessibilityRole="button" onPress={() => { void fetchProducts(page.current + 1) }}>
                  <Text className="font-bold text-primary">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-secondary">{error ? 'Products unavailable' : 'No products found'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
