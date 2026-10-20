import { dummyUser } from '@/assets/assets'
import { useRouter } from 'expo-router'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../../components/Header'
import { ScrollView } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, PROFILE_MENU } from '@/assets/constants'

export default function Profile() {
  // timeline | 4:09:25

  const { user } = { user: dummyUser }
  const router = useRouter()
  const handleLogout = async () => {
    router.replace("/sign-in")
  }
  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Profile" />

      <ScrollView
        className="flex px-4"
        contentContainerStyle={
          !user
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingTop: 16 }
        }
      >
        {/* Guest User Screen */}
        {!user ? (
          <View className="w-full items-center">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-200">
              <Ionicons
                name="person"
                size={40}
                color={COLORS.secondary}
              />
            </View>

            <Text className="mb-2 text-xl font-bold text-primary">
              Guest User
            </Text>

            <Text className="mb-8 w-3/4 px-4 text-center text-base text-secondary">
              Log in to view your profile, orders and addresses
            </Text>

            <TouchableOpacity
              className="w-3/5 items-center rounded-full bg-primary py-3 shadow-lg"
              onPress={() => router.push('/sign-in')}
            >
              <Text className="text-lg font-bold text-white">
                Login / Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Profile Info */}
            <View className="mb-8 items-center">
              <View className="mb-3 items-center">
                <Image
                  className="size-20 rounded-full border-2 border-white shadow-sm"
                  source={{ uri: user.imageUrl }}
                />

                <Text className="text-xl font-bold text-primary">
                  {user.firstName + ' ' + user.lastName}
                </Text>

                <Text className="text-sm text-secondary">
                  {user.emailAddresses[0].emailAddress}
                </Text>

                {/* Admin Panel Button if user is admin */}
                {user.publicMetadata?.role === 'admin' && (
                  <TouchableOpacity
                    onPress={() => router.push('/admin')}
                    className="mt-4 rounded-full bg-primary px-6 py-2"
                  >
                    <Text className="font-bold text-white">Admin Panel</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Menu */}
              <View className="mb-4 w-full rounded-xl border border-gray-100/75 bg-white p-2">
  {PROFILE_MENU.map((item, index) => (
    <TouchableOpacity
      key={item.id}
      className={`w-full flex-row items-center p-4 ${
        index !== PROFILE_MENU.length - 1
          ? 'border-b border-gray-100'
          : ''
      }`}
      onPress={() => router.push(item.route as any)}
    >
      <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-surface">
        <Ionicons
          name={item.icon as any}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <Text className="flex-1 font-medium text-primary">
        {item.title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.secondary}
      />
    </TouchableOpacity>
  ))}
</View>
            </View>
          {/* Logout Button */}
          <TouchableOpacity className='flex-row items-center justify-center p-4'
          onPress={handleLogout}>
            <Text className='text-red-500 font-bold ml-2'>
                    logout
            </Text>
          </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}