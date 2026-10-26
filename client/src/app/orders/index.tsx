import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { FlatList, Text, TouchableOpacity, View, ActivityIndicator, AppState, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/Header";
import { COLORS, getStatusColor } from "@/assets/constants";
import type { Order } from "@/assets/constants/types";
import { formatDate } from "@/assets/assets";
import { useAuth } from "@clerk/clerk-expo";
import axios from "axios";
import api from "../../../constants/api";

export default function Orders() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const { getToken, isLoaded, isSignedIn, userId } = useAuth();
    const getTokenRef = useRef(getToken);
    getTokenRef.current = getToken;
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);

    useFocusEffect(useCallback(() => {
        if (!isLoaded) return;
        setLoading(true);
        const controller = new AbortController();
        let active = true;
        let fetching = false;
        const fetchOrders = async () => {
            if (!active || fetching) return;
            fetching = true;
            setError("");
            try {
                if (!isSignedIn) { setOrders([]); throw new Error("Sign in to view your orders."); }
                const token = await getTokenRef.current();
                if (!token) throw new Error("Please sign in again.");
                const { data } = await api.get('/orders', { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal });
                if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || "Could not load orders.");
                if (active) setOrders(data.data);
            } catch (error) {
                if (active) setError(axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : "Could not load orders.");
            } finally {
                fetching = false;
                if (active) { setLoading(false); setRefreshing(false); }
            }
        };
        void fetchOrders();
        // Refresh only while this screen is focused and the app is active.
        const timer = setInterval(() => {
            if (AppState.currentState === "active") void fetchOrders();
        }, 15000);
        const subscription = AppState.addEventListener("change", state => {
            if (state === "active") void fetchOrders();
        });
        return () => { active = false; clearInterval(timer); subscription.remove(); controller.abort(); };
    }, [isLoaded, isSignedIn, userId, retry]));

    return (
        <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
            <Header title="My Orders" showBack />

            {error ? (
                <View className="items-center px-4 py-4">
                    <Text className="mb-3 text-red-600">{error}</Text>
                    <TouchableOpacity onPress={() => { setLoading(true); setRetry(value => value + 1); }} accessibilityRole="button">
                        <Text className="font-bold text-primary">Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : orders.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-secondary text-lg">{error ? "Orders unavailable" : "No orders found"}</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); setRetry(value => value + 1); }}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 16 }}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            className="bg-white p-4 rounded-xl mb-4 border border-gray-100 shadow-sm"
                            onPress={() => router.push(`/orders/${item._id}`)}
                        >
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-primary font-bold">Order #{item.orderNumber}</Text>
                                <Text className="text-secondary text-sm">{formatDate(item.createdAt)}</Text>
                            </View>

                            {/* Status Badges */}
                            <View className="flex-row gap-2 mb-3">
                                <View className={`px-2 py-1 rounded-full ${getStatusColor(item.orderStatus)}`}>
                                    <Text className={`text-xs font-bold capitalize`}>
                                        {item.orderStatus}
                                    </Text>
                                </View>

                                <View className={`px-2 py-1 rounded-full ${item.paymentStatus === 'paid' ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                    <Text className={`text-xs font-bold capitalize ${item.paymentStatus === 'paid' ? 'text-green-700' : 'text-gray-700'
                                        }`}>
                                        {item.paymentStatus || "Unknown"}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center mb-2">
                                <Text className="text-secondary text-xs">Payment Method: <Text className="text-primary font-medium capitalize">{item.paymentMethod}</Text></Text>
                            </View>

                            {/* Product Images */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                                {item.items.map((prod: any, idx) => {
                                    const image = prod.product?.images?.[0];
                                    return (
                                        <View key={idx} className="mr-3 border border-gray-100 rounded-md p-1 bg-gray-50">
                                            {image ? (
                                                <Image
                                                    source={{ uri: image }}
                                                    className="w-12 h-12 rounded-md"
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View className="w-12 h-12 bg-gray-200 rounded-md justify-center items-center">
                                                    <Ionicons name="image-outline" size={20} color={COLORS.secondary} />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-gray-100">
                                <Text className="text-secondary">Items: {item.items.length}</Text>
                                <Text className="text-primary font-bold text-lg">${item.totalAmount.toFixed(2)}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
    );
}
