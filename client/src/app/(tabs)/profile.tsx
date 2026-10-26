import { useState } from 'react'
import { useRouter } from 'expo-router'
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../components/Header'
import { ScrollView } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, PROFILE_MENU } from '../../../constants'
import { useClerk } from '@clerk/clerk-expo'
import * as ImagePicker from 'expo-image-picker'

export default function Profile() {
  const { user, signOut } = useClerk()
  const router = useRouter()

  const [uploadingImage, setUploadingImage] = useState(false)

  const handleUploadImage = async () => {
    if (!user) return

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Allow photo library access to choose a profile image.',
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled || !result.assets[0]) return

      setUploadingImage(true)

      const response = await fetch(result.assets[0].uri)
      const imageBlob = await response.blob()

      await user.setProfileImage({ file: imageBlob })

      Alert.alert('Profile updated', 'Your profile image has been updated.')
    } catch (error) {
      Alert.alert(
        'Image upload failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.replace('/sign-in' as any)
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
        {!user ? (
          <View className="w-full items-center">
            <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-200">
              <Ionicons name="person" size={40} color={COLORS.secondary} />
            </View>

            <Text className="mb-2 text-xl font-bold text-primary">
              Guest User
            </Text>

            <Text className="mb-8 w-3/4 px-4 text-center text-base text-secondary">
              Log in to view your profile, orders and addresses
            </Text>

            <TouchableOpacity
              className="w-3/5 items-center rounded-full bg-primary py-3 shadow-lg"
              onPress={() => router.push('/sign-in' as any)}
            >
              <Text className="text-lg font-bold text-white">
                Login / Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View className="mb-8 items-center">
              <View className="mb-3 items-center">
                <TouchableOpacity
                  onPress={handleUploadImage}
                  disabled={uploadingImage}
                  className="relative mb-2"
                  accessibilityRole="button"
                  accessibilityLabel="Upload profile image"
                >
                  <Image
                    className="size-20 rounded-full border-2 border-white shadow-sm"
                    source={{ uri: user.imageUrl }}
                  />

                  <View className="absolute bottom-0 right-0 h-7 w-7 items-center justify-center rounded-full bg-primary">
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Ionicons name="camera" size={15} color="white" />
                    )}
                  </View>
                </TouchableOpacity>

                <Text className="text-xl font-bold text-primary">
                  {user.firstName} {user.lastName}
                </Text>

                <Text className="text-sm text-secondary">
                  {user.primaryEmailAddress?.emailAddress}
                </Text>

                {user.publicMetadata?.role === 'admin' && (
                  <TouchableOpacity
                    onPress={() => router.push('/admin' as any)}
                    className="mt-4 rounded-full bg-primary px-6 py-2"
                  >
                    <Text className="font-bold text-white">Admin Panel</Text>
                  </TouchableOpacity>
                )}
              </View>

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

            <TouchableOpacity
              className="flex-row items-center justify-center p-4"
              onPress={handleLogout}
            >
              <Text className="ml-2 font-bold text-red-500">Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}