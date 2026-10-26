import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl, Image, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from '@/assets/constants';
import { useAuth } from "@clerk/clerk-expo";
import api from "../../../../constants/api";
import axios from "axios";
import Toast from "react-native-toast-message";

export default function AdminProducts() {
    const router = useRouter();
    const {getToken} = useAuth()
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
    const [deleteError, setDeleteError] = useState("");

    const fetchProducts = async () => {
       try {
        const {data} = await api.get('/products', { params: { limit: 999 } });
        if(data.success){
            setProducts(data.data)
        }
       } catch (error) {
        console.error("Failed to fetch products:", error);
        Toast.show({
            type:'error',
            text1:'Failed to fetch products',
            text2: axios.isAxiosError(error)
                ? error.response?.data?.message || "Something went wrong"
                : error instanceof Error ? error.message : "Something went wrong"
        })
       }finally{
        setLoading(false);
        setRefreshing(false)
       }
    };

    useFocusEffect(useCallback(() => {
        void fetchProducts();
    }, []));

    const onRefresh = () => {
        setRefreshing(true);
        fetchProducts();
    };

    const performDelete = async (id: string) => {
        if (deletingId) return;
        setDeletingId(id);
        setDeleteError("");
        try {
            const token = await getToken();
            if (!token) throw new Error("Please sign in and try again.");
            const { data } = await api.delete('/products/' + encodeURIComponent(id), {
                headers: { Authorization: 'Bearer ' + token },
            });
            if (!data.success) throw new Error(data.message || "Could not delete product.");
            setProducts(previous => previous.filter(product => product._id !== id));
            setPendingDelete(null);
            Toast.show({ type: "success", text1: "Product deleted" });
        } catch (error) {
            setDeleteError(axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setDeletingId(null);
        }
    };

    const deleteProduct = (id: string, name: string) => {
        if (deletingId) return;
        setDeleteError("");
        setPendingDelete({ id, name });
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 justify-center items-center bg-surface">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-surface">
            <View className="p-4 bg-white border border-gray-100 flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-primary">Total Products ({products.length})</Text>
                <TouchableOpacity
                    onPress={() => router.push("/admin/products/add")}
                    className="bg-gray-800 px-4 py-2 rounded-full flex-row items-center"
                >
                    <Ionicons name="add" size={20} color="white" />
                    <Text className="text-white font-medium ml-1">Add Product</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 p-2"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {products.length === 0 ? (
                    <View className="flex-1 justify-center items-center mt-20">
                        <Text className="text-secondary">No products found</Text>
                    </View>
                ) : (
                    products.map((product: any) => (
                        <View key={product._id} className="bg-white p-3 rounded-lg border border-gray-100 mb-3 flex-row items-center">
                            <Image
                                source={{ uri: product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150' }}
                                className="w-16 h-16 rounded-lg bg-gray-100 mr-3"
                                resizeMode="cover"
                            />

                            <View className="flex-1">
                                <Text className="font-bold text-primary text-base" numberOfLines={1}>{product.name}</Text>
                                <Text className="text-secondary text-xs mb-1" numberOfLines={1}>Category : {product.category || 'Others'}</Text>
                                <Text className="text-secondary text-xs mb-1" numberOfLines={1}>Stock : {product.stock}</Text>
                                <Text className="text-secondary text-xs mb-1" numberOfLines={1}>Sizes : {Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes.join(", ") : "Not specified"}</Text>
                                <Text className="text-primary font-bold">${product.price.toFixed(2)}</Text>
                            </View>

                            <View className="flex-row items-center">
                                <TouchableOpacity
                                    onPress={() => router.push(`/admin/products/edit/${product._id}`)}
                                    className="p-2 bg-slate-50 rounded-full mr-2"
                                >
                                    <Ionicons name="create-outline" size={18} color="#333333" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => deleteProduct(product._id, product.name)}
                                    disabled={deletingId !== null}
                                    accessibilityLabel="Delete product"
                                    className="p-2 bg-gray-50 rounded-full"
                                >
                                    {deletingId === product._id ? <ActivityIndicator size="small" color="#333333" /> : <Ionicons name="trash-outline" size={18} color="#333333" />}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
            <Modal
                visible={pendingDelete !== null}
                transparent
                animationType="fade"
                onRequestClose={() => { if (!deletingId) setPendingDelete(null); }}
            >
                <View className="flex-1 items-center justify-center bg-black/50 px-6">
                    <View className="w-full max-w-sm rounded-2xl bg-white p-6" accessibilityViewIsModal>
                        <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-red-50">
                            <Ionicons name="trash-outline" size={24} color="#dc2626" />
                        </View>
                        <Text accessibilityRole="header" className="mb-2 text-xl font-bold text-primary">Delete product?</Text>
                        <Text className="mb-6 text-secondary">Delete “{pendingDelete?.name}”? This cannot be undone.</Text>
                        {deleteError ? <Text accessibilityRole="alert" className="mb-4 text-red-600">{deleteError}</Text> : null}
                        <View className="flex-row justify-end">
                            <TouchableOpacity
                                accessibilityRole="button"
                                onPress={() => setPendingDelete(null)}
                                disabled={deletingId !== null}
                                className="mr-3 rounded-xl bg-gray-100 px-5 py-3"
                            >
                                <Text className="font-semibold text-primary">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                accessibilityRole="button"
                                onPress={() => { if (pendingDelete) void performDelete(pendingDelete.id); }}
                                disabled={deletingId !== null}
                                className={"min-w-24 items-center rounded-xl bg-red-600 px-5 py-3 " + (deletingId ? "opacity-60" : "")}
                            >
                                {deletingId ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Delete</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
