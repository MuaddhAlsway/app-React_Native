import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Toast from "react-native-toast-message";
import { COLORS, CATEGORIES } from "@/assets/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import api from "../../../../constants/api";
import { appendProductImages } from "../../../../utils/productImages";

export default function AddProduct() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [category, setCategory] = useState("Men");
  const [sizes, setSizes] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages(result.assets.slice(0, 5));
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock || "0");
    const parsedSizes = sizes
      .split(",")
      .map((size) => size.trim())
      .filter(Boolean);

    if (
      !trimmedName ||
      !price.trim() ||
      !category ||
      parsedSizes.length === 0
    ) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Enter the name, price, category, and sizes.",
      });
      return;
    }

    if (images.length === 0) {
      Toast.show({
        type: "error",
        text1: "Image required",
        text2: "Select at least one product image.",
      });
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      Toast.show({
        type: "error",
        text1: "Invalid price",
        text2: "Enter a valid price greater than zero.",
      });
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      Toast.show({
        type: "error",
        text1: "Invalid stock",
        text2: "Stock must be zero or a positive whole number.",
      });
      return;
    }

    try {
      setSubmitting(true);

      const token = await getToken();

      if (!token) {
        throw new Error("You are not signed in. Please sign in and try again.");
      }

      const formData = new FormData();

      formData.append("name", trimmedName);
      formData.append("description", description.trim());
      formData.append("price", String(parsedPrice));
      formData.append("stock", String(parsedStock));
      formData.append("category", category);
      formData.append("isFeatured", String(isFeatured));
      formData.append("sizes", JSON.stringify(parsedSizes));

      await appendProductImages(formData, images, Platform.OS);

      const baseURL = api.defaults.baseURL;

      if (!baseURL) {
        throw new Error("API base URL is not configured.");
      }

      // Use fetch with FormData - React Native's fetch handles FormData better
      // Don't set Content-Type header - let fetch set it automatically with boundary
      const response = await fetch(`${baseURL}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message || `Request failed with status ${response.status}.`,
        );
      }

      Toast.show({
        type: "success",
        text1: "Product added",
        text2: result?.message || `${trimmedName} was added successfully.`,
      });

      (router.canGoBack() ? router.back() : router.replace('/admin/products'));
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not add product",
        text2: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface p-4">
      <View className="mb-20 rounded-xl bg-white p-4 shadow-sm">
        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Product Name *
        </Text>
        <TextInput
          className="mb-4 rounded-lg bg-surface p-3 text-primary"
          placeholder="e.g. Wireless Headphones"
          value={name}
          onChangeText={setName}
        />

        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Price ($) *
        </Text>
        <TextInput
          className="mb-4 rounded-lg bg-surface p-3 text-primary"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />

        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Category
        </Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="mb-4 flex-row items-center justify-between rounded-lg bg-surface p-3"
        >
          <Text className="text-primary">{category}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="max-h-[50%] rounded-t-2xl bg-white p-4">
                <Text className="mb-4 text-center text-lg font-bold">
                  Select Category
                </Text>

                <FlatList
                  data={CATEGORIES}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`border-b p-4 ${
                        category === item.name ? "bg-primary/5" : ""
                      }`}
                      onPress={() => {
                        setCategory(item.name);
                        setModalVisible(false);
                      }}
                    >
                      <View className="flex-row justify-between">
                        <Text
                          className={
                            category === item.name
                              ? "font-bold text-primary"
                              : ""
                          }
                        >
                          {item.name}
                        </Text>

                        {category === item.name && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={COLORS.primary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Stock Level
        </Text>
        <TextInput
          className="mb-4 rounded-lg bg-surface p-3 text-primary"
          placeholder="0"
          keyboardType="number-pad"
          value={stock}
          onChangeText={setStock}
        />

        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Sizes (comma separated)
        </Text>
        <TextInput
          className="mb-4 rounded-lg bg-surface p-3 text-primary"
          placeholder="e.g. S, M, L, XL"
          value={sizes}
          onChangeText={setSizes}
        />

        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Product Images (max 5)
        </Text>
        <TouchableOpacity onPress={pickImages} className="mb-4">
          {images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map(({ uri }, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  className="mr-2 h-32 w-32 rounded-lg"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View className="h-32 w-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100">
              <Ionicons
                name="cloud-upload-outline"
                size={32}
                color={COLORS.secondary}
              />
              <Text className="mt-2 text-xs text-secondary">
                Tap to upload images
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text className="mb-1 text-xs font-bold uppercase text-secondary">
          Description
        </Text>
        <TextInput
          className="mb-6 h-24 rounded-lg bg-surface p-3 text-primary"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View className="mb-6 flex-row items-center justify-between">
          <Text className="font-bold text-primary">Featured Product</Text>
          <Switch
            value={isFeatured}
            onValueChange={setIsFeatured}
            trackColor={{ false: "#eee", true: COLORS.primary }}
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          className={`items-center rounded-xl bg-primary p-4 ${
            submitting ? "opacity-70" : ""
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">
              Create Product
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}