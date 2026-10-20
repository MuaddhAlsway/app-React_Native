import { useState } from 'react'
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Link } from 'expo-router'
import { useSignIn } from '@clerk/clerk-expo'

export default function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn()
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    if (!isLoaded) return

    try {
      setLoading(true)

      const result = await signIn.create({
        identifier: emailAddress,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        Alert.alert('Sign-in incomplete', 'Please try again.')
      }
    } catch (error) {
      Alert.alert(
        'Sign-in failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-2 text-2xl font-bold">Welcome back</Text>

      <TextInput
        className="mb-3 rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Email address"
        value={emailAddress}
        onChangeText={setEmailAddress}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <TextInput
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />

      <TouchableOpacity
        className="items-center rounded-lg bg-black py-3"
        onPress={handleSignIn}
        disabled={loading || !isLoaded}
      >
        <Text className="font-bold text-white">
          {loading ? 'Signing in…' : 'Sign in'}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-up" className="mt-5 text-center text-gray-700">
        Don’t have an account? Sign up
      </Link>
    </View>
  )
}