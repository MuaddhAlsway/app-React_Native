import { dummyProducts } from '@/assets/assets'
import { Product } from '@/assets/constants/types'
import { useEffect, useState } from 'react'
import { ActivityIndicator, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../components/Header'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '@/assets/constants'
import { FlatList, Text, TextInput } from 'react-native-gesture-handler'
import ProductCard from '../../components/ProductCard'

export default function Shop() {
  const [product, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchProducts = async (pageNumber = 1) => {
    if (pageNumber === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const start = (pageNumber - 1) * 10
      const end = start + 10
      const paginatedData = dummyProducts.slice(start, end)

      if (pageNumber === 1) {
        setProducts(paginatedData)
      } else {
        setProducts((previousProducts) => [
          ...previousProducts,
          ...paginatedData,
        ])
      }

      setHasMore(end < dummyProducts.length)
      setPage(pageNumber)
    } catch (error) {
      console.error('Pagination error:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && !loading && hasMore) {
      fetchProducts(page + 1)
    }
  }

  useEffect(() => {
    fetchProducts(1)
  }, [])

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
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-secondary">No Product found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}