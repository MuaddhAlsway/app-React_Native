import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, Switch, Image, ActivityIndicator, Platform, Modal, FlatList, TouchableWithoutFeedback } from "react-native";
import Toast from 'react-native-toast-message';
import { COLORS, CATEGORIES } from "@/assets/constants";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { appendProductImages } from "../../../../../utils/productImages";
import { useAuth } from "@clerk/clerk-expo";
import api from "../../../../../constants/api";

export default function EditProduct() {
    const {getToken} = useAuth()
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [stock, setStock] = useState("");
    const [category, setCategory] = useState("");
    const [sizes, setSizes] = useState("");
    const [isFeatured, setIsFeatured] = useState(false);

    // Image State
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

    useEffect(() => {
        let active = true;
        const fetchProduct = async () => {
            try {
                if (!id) throw new Error("Product ID is missing.");
                const { data } = await api.get('/products/' + encodeURIComponent(id));
                if (!data.success || !data.data) throw new Error(data.message || "Product not found.");
                if (!active) return;
                const product = data.data;
                setName(product.name || "");
                setDescription(product.description || "");
                setPrice(String(product.price ?? ""));
                setStock(String(product.stock ?? 0));
                setCategory(typeof product.category === 'object' ? product.category?.name || "" : product.category || "");
                setIsFeatured(Boolean(product.isFeatured));
                setSizes(Array.isArray(product.sizes) ? product.sizes.join(", ") : typeof product.sizes === "string" ? product.sizes : "");
                setExistingImages(Array.isArray(product.images) ? product.images.filter((image: unknown) => typeof image === "string") : typeof product.images === "string" ? [product.images] : []);
                setNewImages([]);
            } catch (error) {
                if (!active) return;
                Toast.show({ type: "error", text1: "Failed to Fetch Product", text2: axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : "Something went wrong" });
                (router.canGoBack() ? router.back() : router.replace('/admin/products'));
            } finally {
                if (active) setLoading(false);
            }
        };
        setLoading(true);
        void fetchProduct();
        return () => { active = false; };
    }, [id, router]);

    const pickImages = async () => {
        const remaining = 5 - existingImages.length - newImages.length;
        if (remaining <= 0) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"], allowsMultipleSelection: true,
                selectionLimit: remaining, quality: 0.8,
            });
            if (!result.canceled) {
                setNewImages(previous => [...previous, ...result.assets].slice(0, 5 - existingImages.length));
            }
        } catch (error) {
            Toast.show({ type: "error", text1: "Could not select images", text2: error instanceof Error ? error.message : "Please try again." });
        }
    };

    const removeExistingImage = (index: number) => {
        const updated = [...existingImages];
        updated.splice(index, 1);
        setExistingImages(updated);
    };

    const removeNewImage = (index: number) => {
        const updated = [...newImages];
        updated.splice(index, 1);
        setNewImages(updated);
    };

    const handleSubmit = async () => {
        if (submitting) return;
        const parsedSizes = sizes.split(",").map(size => size.trim()).filter(Boolean);
        const parsedPrice = Number(price);
        const parsedStock = Number(stock || "0");
        if (!name.trim() || !description.trim() || !category || !price.trim() || !parsedSizes.length || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedStock) || parsedStock < 0) {
            Toast.show({ type: "error", text1: "Invalid product", text2: "Enter a name, description, category, sizes, a positive price, and valid stock." });
            return;
        }
        if (existingImages.length + newImages.length < 1 || existingImages.length + newImages.length > 5) {
            Toast.show({ type: "error", text1: "Images required", text2: "Keep between one and five product images." });
            return;
        }
        try {
            setSubmitting(true);
            const token = await getToken();
            if (!token) throw new Error("Please sign in and try again.");
            const formData = new FormData();
            formData.append("name", name.trim());
            formData.append("description", description.trim());
            formData.append("price", String(parsedPrice));
            formData.append("stock", String(parsedStock));
            formData.append("category", category);
            formData.append("isFeatured", String(isFeatured));
            formData.append("sizes", JSON.stringify(parsedSizes));
            // An explicit empty array means all original images were removed.
            formData.append("existingImages", JSON.stringify(existingImages));
            if (newImages.length) await appendProductImages(formData, newImages, Platform.OS);
            if (!api.defaults.baseURL || !id) throw new Error("Product API is not configured.");
            const response = await fetch(api.defaults.baseURL + '/products/' + encodeURIComponent(id), {
                method: "PUT", headers: { Authorization: 'Bearer ' + token }, body: formData,
            });
            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.success) throw new Error(result?.message || "Could not update product.");
            const saved = result.data;
            if (!Array.isArray(saved?.sizes) || JSON.stringify(saved.sizes) !== JSON.stringify(parsedSizes)) {
                throw new Error("The running backend did not save sizes. Restart Express from the updated server folder, then save again.");
            }
            if (!Array.isArray(saved?.images) || saved.images.some((image: unknown) => typeof image !== "string" || !/^https?:\/\//.test(image))) {
                throw new Error("The running backend saved invalid image URLs. Restart Express from the updated server folder before saving again.");
            }
            Toast.show({ type: "success", text1: "Product updated" });
            router.replace('/admin/products'); 
        } catch (error) {
            Toast.show({ type: "error", text1: "Failed to Update Product", text2: error instanceof Error ? error.message : "Something went wrong" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-surface p-4">
            <View className="bg-white p-4 rounded-xl border border-gray-100 mb-20">
                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Product Name *</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    value={name}
                    onChangeText={setName}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Price ($) *</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Stock Level</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    keyboardType="number-pad"
                    value={stock}
                    onChangeText={setStock}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Sizes (comma separated)</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-4 text-primary"
                    placeholder="e.g. S, M, L"
                    value={sizes}
                    onChangeText={setSizes}
                />

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">
                    Category
                </Text>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="bg-surface p-3 rounded-lg mb-4 flex-row justify-between items-center"
                >
                    <Text className="text-primary">{category || "Select Category"}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                <Modal visible={modalVisible} animationType="slide" transparent>
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View className="flex-1 justify-end bg-black/50">
                            <View className="bg-white rounded-t-2xl p-4 max-h-[50%]">
                                <Text className="text-lg font-bold text-center mb-4">Select Category</Text>
                                <FlatList
                                    data={CATEGORIES}
                                    keyExtractor={(item) => String(item.id)}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            className={`p-4 border-b ${category === item.name ? "bg-primary/5" : ""}`}
                                            onPress={() => {
                                                setCategory(item.name);
                                                setModalVisible(false);
                                            }}
                                        >
                                            <View className="flex-row justify-between">
                                                <Text className={`${category === item.name ? "font-bold text-primary" : ""}`}>{item.name}</Text>
                                                {category === item.name && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Images</Text>
                <View className="mb-4">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {existingImages.map((uri, index) => (
                            <View key={`existing-${index}`} className="relative mr-2">
                                <Image source={{ uri }} className="w-24 h-24 rounded-lg" />
                                <TouchableOpacity
                                    onPress={() => removeExistingImage(index)}
                                    className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                                >
                                    <Ionicons name="close" size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {newImages.map(({ uri }, index) => (
                            <View key={`new-${index}`} className="relative mr-2">
                                <Image source={{ uri }} className="w-24 h-24 rounded-lg border-2 border-primary" />
                                <TouchableOpacity
                                    onPress={() => removeNewImage(index)}
                                    className="absolute top-1 right-1 bg-primary rounded-full p-1"
                                >
                                    <Ionicons name="close" size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {(existingImages.length + newImages.length) < 5 && (
                            <TouchableOpacity
                                onPress={pickImages}
                                className="w-24 h-24 rounded-lg bg-gray-100 justify-center items-center border border-dashed border-gray-300"
                            >
                                <Ionicons name="add" size={24} color={COLORS.secondary} />
                                <Text className="text-xs text-secondary mt-1">Add</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>

                <Text className="text-secondary text-xs font-bold mb-1 uppercase">Description</Text>
                <TextInput
                    className="bg-surface p-3 rounded-lg mb-6 text-primary h-24"
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={setDescription}
                />

                <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-primary font-bold">Featured Product</Text>
                    <Switch
                        value={isFeatured}
                        onValueChange={setIsFeatured}
                        trackColor={{ false: "#eee", true: COLORS.primary }}
                    />
                </View>

                <TouchableOpacity
                    className={`bg-primary p-4 rounded-xl items-center ${submitting ? 'opacity-70' : ''}`}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-medium text-lg">Update Product</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
