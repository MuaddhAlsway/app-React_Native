import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
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
import { COLORS } from '@/assets/constants'
import type { Address } from '@/assets/constants/types'
import { dummyAddress } from '@/assets/assets'

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

  useEffect(() => {
    fetchAddresses()
  }, [])

  const fetchAddresses = async () => {
    setAddresses(dummyAddress as any)
    setLoading(false)
  }

  const handleEditSearch = (item: Address) => {
    setIsEditing(true)
    setEditingId(item._id)
    setType(item.type)
    setStreet(item.street)
    setCity(item.city)
    setState(item.state)
    setZipCode(item.zipCode)
    setCountry(item.country)
    setIsDefault(item.isDefault)
    setModalVisible(true)
  }

  const handleSaveAddress = async () => {
    setModalVisible(false)
    resetForm()
    fetchAddresses()
  }

  const handleDeleteAddress = async (id: string) => {}

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
    resetForm()
    setModalVisible(true)
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <Header title="Shipping Addresses" showBack />

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
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-[85%] rounded-t-3xl bg-white p-6">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-primary">
                {isEditing ? 'Edit Address' : 'Add New Address'}
              </Text>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
    </SafeAreaView>
  )
}
