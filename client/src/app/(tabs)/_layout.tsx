import { Feather, Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { COLORS } from '@/assets/constants'
import { useCart } from '../../../context/CartContext'
import { View } from 'react-native'

export default function TabLayout() {
  const { cartItem } = useCart()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#CDCDE0',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          height: 60,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <View className="relative">
              <Feather
                name={focused ? 'shopping-cart' : 'shopping-cart'}
                size={26}
                color={color}
              />

              {cartItem?.length > 0 && (
                <View className="absolute -right-2 -top-2 h-3 w-3 items-center justify-center rounded-full bg-accent">
                  <Ionicons name="ellipse" size={6} color="white" />
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="favorite"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  )
}