import { HeaderProps } from '@/assets/constants/types'
import { COLORS } from '@/assets/constants'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Image, Text, TouchableOpacity, View } from 'react-native'

export default function Header({
  title,
  showBack,
  showSearch,
  showCart,
  showMenu,
  showLogo,
}: HeaderProps) {
  const router = useRouter()
  const itemCount = 6

  return (
    <View className="flex-row items-center justify-between bg-white px-4 py-3">
      {/* Left side */}
      <View className="flex-1 flex-row items-center">
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {showMenu && (
          <TouchableOpacity
            className="mr-1"
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {showLogo ? (
          <View className="flex-1">
            <Image
              source={require('@/assets/logo.png')}
              style={{ width: '100%', height: 24 }}
              resizeMode="contain"
              accessibilityLabel="App logo"
            />
          </View>
        ) : (
          title && (
            <Text
              className="mr-8 flex-1 text-center text-xl font-bold text-primary"
              numberOfLines={1}
            >
              {title}
            </Text>
          )
        )}
      </View>

      {/* Right side */}
      <View className="flex-row items-center">
        {showSearch && (
          <TouchableOpacity
            className="ml-4"
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}

        {showCart && (
          <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart')}
            className="ml-4"
            accessibilityRole="button"
            accessibilityLabel={`Open cart, ${itemCount} items`}
          >
            <View className="relative">
              <Ionicons name="bag-outline" size={24} color={COLORS.primary} />

              {itemCount > 0 && (
                <View
                  className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full px-1"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {itemCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}