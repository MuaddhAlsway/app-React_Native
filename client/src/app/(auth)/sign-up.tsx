import { useState } from 'react'
import {
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSignUp } from '@clerk/clerk-expo'

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [pendingVerification, setPendingVerification] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!isLoaded) return

    try {
      setLoading(true)

      await signUp.create({
        firstName,
        lastName,
        emailAddress,
        password,
      })

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      })

      setPendingVerification(true)
    } catch (error: any) {
      const clerkError = error?.errors?.[0]
      const errorCode = clerkError?.code ?? error?.code
      const clerkLongMessage =
        clerkError?.longMessage ?? clerkError?.long_message
      const clerkMessage = clerkError?.message
      const errorMessage =
        clerkLongMessage ??
        clerkMessage ??
        (typeof error?.message === 'string' ? error.message : undefined)

      if (errorCode === 'form_password_pwned') {
        Alert.alert(
          'Password found in a data breach',
          'This password was found in a known data breach. Please choose a different, unique password.',
        )
      } else {
        Alert.alert('Sign-up failed', errorMessage ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!isLoaded) return

    try {
      setLoading(true)

      const result = await signUp.attemptEmailAddressVerification({ code })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
      } else {
        Alert.alert('Verification incomplete', 'Please try again.')
      }
    } catch (error) {
      Alert.alert(
        'Verification failed',
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="flex-1 justify-center bg-white px-6">
      {pendingVerification ? (
        <>
          <Text className="mb-2 text-2xl font-bold">Verify your email</Text>
          <TextInput
            className="mb-4 rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            className="items-center rounded-lg bg-black py-3"
            onPress={handleVerifyCode}
            disabled={loading}
          >
            <Text className="font-bold text-white">
              {loading ? 'Verifying…' : 'Verify'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text className="mb-2 text-2xl font-bold">Create your account</Text>

          <TextInput
            className="mb-3 rounded-lg border border-gray-300 px-4 py-3"
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <TextInput
            className="mb-3 rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <TextInput
            className="mb-3 rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Email address"
            value={emailAddress}
            onChangeText={setEmailAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            className="mb-4 rounded-lg border border-gray-300 px-4 py-3"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            className="items-center rounded-lg bg-black py-3"
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text className="font-bold text-white">
              {loading ? 'Creating account…' : 'Sign up'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}