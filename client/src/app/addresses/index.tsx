import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useRef, useState } from 'react'
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Header from '../../components/Header'
import { COLORS } from "@/assets/constants";
import type { Address } from '@/assets/constants/types'
import { useAuth } from '@clerk/clerk-expo'
import { useFocusEffect } from 'expo-router'
import axios from 'axios'
import api from '../../../constants/api'
import Toast from 'react-native-toast-message'

export default function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)

  // Form state
  const [type, setType] = useState('Home')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  // Clerk Expo wraps getToken in a new function each render.
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken
  const owner = useRef(userId)
  owner.current = userId
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [retry, setRetry] = useState(0)
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const messageFor = (error: unknown) => axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : 'Request failed.'
  const authHeaders = useCallback(async () => {
    if (!isSignedIn) throw new Error('Sign in to manage your addresses.')
    const token = await getTokenRef.current()
    if (!token) throw new Error('Please sign in again.')
    return { Authorization: 'Bearer ' + token }
  }, [isSignedIn])

  useFocusEffect(useCallback(() => {
    if (!isLoaded) return
    let active = true
    const controller = new AbortController()
    setAddresses([])
    setModalVisible(false)
    setPendingDelete(null)
    setLoading(true)
    setError('')
    const fetchAddresses = async () => {
      try {
        const headers = await authHeaders()
        const { data } = await api.get('/addresses', { headers, signal: controller.signal })
        if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Could not load addresses.')
        if (active) setAddresses(data.data)
      } catch (error) { if (active) setError(messageFor(error)) }
      finally { if (active) setLoading(false) }
    }
    void fetchAddresses()
    return () => { active = false; controller.abort() }
  }, [isLoaded, isSignedIn, userId, authHeaders, retry]))

  const handleEditSearch = (item: Address) => {
    if (submitting || deleting) return
    setFormError('')
    setIsEditing(true)
    setEditingId(item._id)
    setType(item.type)
    setStreet(item.street || '')
    setCity(item.city || '')
    setState(item.state || '')
    setZipCode(item.zipCode || '')
    setCountry(item.country || '')
    setIsDefault(item.isDefault)
    setModalVisible(true)
  }

  const handleSaveAddress = async () => {
    if (submitting || deleting) return
    const payload = { type, street: street.trim(), city: city.trim(), state: state.trim(), zipCode: zipCode.trim(), country: country.trim(), isDefault }
    if (!payload.street || !payload.city || !payload.state || !payload.zipCode || !payload.country) {
      setFormError('Fill in all address fields.')
      return
    }
    if (isEditing && !editingId) { setFormError('Address ID is missing.'); return }
    const currentOwner = userId
    setSubmitting(true)
    setFormError('')
    try {
      const headers = await authHeaders()
      if (owner.current !== currentOwner) return
      const { data } = isEditing
        ? await api.put('/addresses/' + encodeURIComponent(editingId!), payload, { headers })
        : await api.post('/addresses', payload, { headers })
      if (!data.success || !data.data?._id) throw new Error(data.message || 'Could not save address.')
      if (owner.current !== currentOwner) return
      const saved: Address = data.data
      setAddresses(previous => [...previous.filter(item => item._id !== saved._id).map(item => saved.isDefault ? { ...item, isDefault: false } : item), saved].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)))
      setModalVisible(false)
      resetForm()
      Toast.show({ type: 'success', text1: 'Address saved' })
    } catch (error) { if (owner.current === currentOwner) setFormError(messageFor(error)) }
    finally { setSubmitting(false) }
  }

  const handleDeleteAddress = (id: string) => {
    if (submitting || deleting) return
    setDeleteError('')
    setPendingDelete(addresses.find(item => item._id === id) || null)
  }
  const confirmDeleteAddress = async () => {
    if (!pendingDelete || deleting) return
    const currentOwner = userId
    setDeleting(true)
    setDeleteError('')
    try {
      const headers = await authHeaders()
      if (owner.current !== currentOwner) return
      const { data } = await api.delete('/addresses/' + encodeURIComponent(pendingDelete._id), { headers })
      if (!data.success) throw new Error(data.message || 'Could not delete address.')
      if (owner.current !== currentOwner) return
      setAddresses(previous => previous.filter(item => item._id !== pendingDelete._id))
      setPendingDelete(null)
    } catch (error) { if (owner.current === currentOwner) setDeleteError(messageFor(error)) }
    finally { setDeleting(false) }
  }

  const resetForm = () => {
    setStreet('')
    setCity('')
    setState('')
    setZipCode('')
    setCountry('')
    setType('Home')
    setIsDefault(false)
    setIsEditing(false)
    setEditingId(null)
  }

  const openAddModal = () => {
    if (submitting || deleting) return
    setFormError('')
    resetForm()
    setModalVisible(true)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Shipping Addresses" showBack />

      {error ? <View className="items-center px-4 py-3"><Text className="mb-2 text-red-600">{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text className="font-bold text-primary">Retry</Text></TouchableOpacity></View> : null}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {addresses.length === 0 ? (
            <Text className="mt-10 text-center text-secondary">
              No addresses found
            </Text>
          ) : (
            addresses.map((item) => (
              <View
                key={item._id}
                className="mb-4 rounded-xl bg-white p-4 shadow-sm"
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        item.type === 'Home'
                          ? 'home-outline'
                          : 'briefcase-outline'
                      }
                      size={20}
                      color={COLORS.primary}
                    />
                    <Text className="ml-2 text-base font-bold text-primary">
                      {item.type}
                    </Text>

                    {item.isDefault && (
                      <View className="ml-2 rounded bg-primary/10 px-2 py-1">
                        <Text className="text-xs font-bold text-primary">
                          Default
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity onPress={() => handleEditSearch(item)}>
                      <Ionicons
                        name="pencil-outline"
                        size={20}
                        color={COLORS.secondary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteAddress(item._id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={COLORS.error || '#ff4444'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="ml-7 leading-5 text-secondary">
                  {item.street}, {item.city}, {item.state} {item.zipCode},{' '}
                  {item.country}
                </Text>
              </View>
            ))
          )}

          <TouchableOpacity
            className="mb-8 mt-2 flex-row items-center justify-center rounded-xl border border-dashed border-gray-300 p-4"
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color={COLORS.secondary} />
            <Text className="ml-2 font-medium text-secondary">
              Add New Address
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Add Address Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => { if (!submitting) setModalVisible(false) }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-[85%] rounded-t-3xl bg-white p-6">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-primary">
                {isEditing ? 'Edit Address' : 'Add New Address'}
              </Text>

              <TouchableOpacity disabled={submitting} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text accessibilityRole="alert" className="mb-4 text-red-600">{formError}</Text> : null}
              <Text className="mb-2 font-medium text-primary">Label</Text>

              <View className="mb-4 flex-row gap-3">
                {['Home', 'Work', 'Other'].map((addressType) => (
                  <TouchableOpacity
                    key={addressType}
                    onPress={() => setType(addressType)}
                    className={`rounded-full border px-4 py-2 ${
                      type === addressType
                        ? 'border-primary bg-primary'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <Text
                      className={
                        type === addressType ? 'text-white' : 'text-primary'
                      }
                    >
                      {addressType}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="mb-2 font-medium text-primary">
                Street Address
              </Text>
              <TextInput
                className="mb-4 rounded-xl bg-surface p-4 text-primary"
                placeholder="123 Main St"
                value={street}
                onChangeText={setStreet}
              />

              <View className="mb-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-2 font-medium text-primary">City</Text>
                  <TextInput
                    className="rounded-xl bg-surface p-4 text-primary"
                    placeholder="New York"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 font-medium text-primary">State</Text>
                  <TextInput
                    className="rounded-xl bg-surface p-4 text-primary"
                    placeholder="NY"
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </View>

              <View className="mb-4 flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-2 font-medium text-primary">
                    Zip Code
                  </Text>
                  <TextInput
                    className="rounded-xl bg-surface p-4 text-primary"
                    placeholder="10001"
                    value={zipCode}
                    onChangeText={setZipCode}
                    keyboardType="numeric"
                  />
                </View>

                <View className="flex-1">
                  <Text className="mb-2 font-medium text-primary">
                    Country
                  </Text>
                  <TextInput
                    className="rounded-xl bg-surface p-4 text-primary"
                    placeholder="USA"
                    value={country}
                    onChangeText={setCountry}
                  />
                </View>
              </View>

              <TouchableOpacity
                className="mb-8 flex-row items-center"
                onPress={() => setIsDefault(!isDefault)}
              >
                <View
                  className={`mr-2 h-5 w-5 items-center justify-center rounded border ${
                    isDefault
                      ? 'border-primary bg-primary'
                      : 'border-gray-300'
                  }`}
                >
                  {isDefault && (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text className="text-primary">Set as default address</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mb-10 w-full items-center rounded-full bg-primary py-4"
                onPress={handleSaveAddress}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-lg font-bold text-white">
                    Save Address
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={pendingDelete !== null} transparent animationType="fade" onRequestClose={() => { if (!deleting) setPendingDelete(null) }}>
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full max-w-sm rounded-2xl bg-white p-6" accessibilityViewIsModal>
            <Text accessibilityRole="header" className="mb-3 text-xl font-bold text-primary">Delete address?</Text>
            <Text className="mb-5 text-secondary">Remove your {pendingDelete?.type} address at {pendingDelete?.street}?</Text>
            {deleteError ? <Text accessibilityRole="alert" className="mb-4 text-red-600">{deleteError}</Text> : null}
            <View className="flex-row justify-end">
              <TouchableOpacity disabled={deleting} onPress={() => setPendingDelete(null)} className="mr-3 rounded-xl bg-gray-100 px-5 py-3"><Text className="font-semibold text-primary">Cancel</Text></TouchableOpacity>
              <TouchableOpacity disabled={deleting} onPress={() => { void confirmDeleteAddress() }} className="rounded-xl bg-red-600 px-5 py-3">{deleting ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Delete</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
