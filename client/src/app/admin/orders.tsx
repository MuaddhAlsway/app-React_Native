import React, { useCallback, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ActivityIndicator, RefreshControl, Modal, TouchableWithoutFeedback, FlatList } from "react-native";
import { COLORS, getStatusColor } from "../../../constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from "expo-router";
import axios from "axios";
import api from "../../../constants/api";
import Toast from "react-native-toast-message";

export default function AdminOrders() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);

    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [updating, setUpdating] = useState(false);

    const STATUSES = ["placed", "processing", "shipped", "delivered", "cancelled"];

    const { getToken, isLoaded, isSignedIn, userId } = useAuth();
    const tokenRef = useRef(getToken);
    tokenRef.current = getToken;
    const owner = useRef(userId);
    owner.current = userId;
    const [error, setError] = useState("");
    const [statusError, setStatusError] = useState("");
    const [retry, setRetry] = useState(0);
    const failureMessage = (cause: unknown) => axios.isAxiosError(cause) ? cause.response?.data?.message || cause.message : cause instanceof Error ? cause.message : "Request failed.";

    useFocusEffect(useCallback(() => {
        if (!isLoaded) return;
        let active = true;
        const controller = new AbortController();
        setError("");
        const fetchOrders = async () => {
            try {
                if (!isSignedIn) { setOrders([]); throw new Error("Sign in as an admin to view orders."); }
                const token = await tokenRef.current();
                if (!token) throw new Error("Please sign in again.");
                const allOrders: any[] = [];
                let pages = 1;
                for (let page = 1; page <= pages; page++) {
                    const { data } = await api.get('/orders/admin/all', { headers: { Authorization: 'Bearer ' + token }, params: { page, limit: 100 }, signal: controller.signal });
                    if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || "Could not load orders.");
                    allOrders.push(...data.data);
                    pages = data.pagination?.pages || 1;
                }
                if (active) setOrders([...new Map(allOrders.map(order => [order._id, order])).values()]);
            } catch (cause) { if (active) { setOrders([]); setError(failureMessage(cause)); } }
            finally { if (active) { setLoading(false); setRefreshing(false); } }
        };
        setLoading(true);
        setStatusModalVisible(false);
        void fetchOrders();
        return () => { active = false; controller.abort(); };
    }, [isLoaded, isSignedIn, userId, retry]));

    const onRefresh = () => { setRefreshing(true); setRetry(value => value + 1); };

    const openStatusModal = (order: any) => {
        if (updating) return;
        setStatusError("");
        setSelectedOrder(order);
        setStatusModalVisible(true);
    };

    const updateStatus = async (newStatus: string) => {
        if (!selectedOrder || updating) return;
        const currentOwner = userId;
        setUpdating(true);
        setStatusError("");
        try {
            const token = await tokenRef.current();
            if (!token || owner.current !== currentOwner) throw new Error("Please sign in again.");
            const { data } = await api.put('/orders/' + encodeURIComponent(selectedOrder._id) + '/status', { orderStatus: newStatus }, { headers: { Authorization: 'Bearer ' + token } });
            if (!data.success || !data.data) throw new Error(data.message || "Could not update status.");
            // Verify the saved record before showing success.
            const verified = await api.get('/orders/' + encodeURIComponent(selectedOrder._id), { headers: { Authorization: 'Bearer ' + token } });
            if (!verified.data.success || verified.data.data?.orderStatus !== newStatus) throw new Error("The saved order status could not be verified. Refresh and try again.");
            if (owner.current !== currentOwner) return;
            setOrders(previous => previous.map(order => order._id === selectedOrder._id ? { ...order, orderStatus: data.data.orderStatus, paymentStatus: data.data.paymentStatus, deliveredAt: data.data.deliveredAt } : order));
            setStatusModalVisible(false);
            Toast.show({ type: "success", text1: "Order status updated" });
        } catch (cause) { if (owner.current === currentOwner) setStatusError(failureMessage(cause)); }
        finally { setUpdating(false); }
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
            {error ? <View className="items-center px-4 py-3"><Text className="mb-2 text-red-600">{error}</Text><TouchableOpacity onPress={onRefresh}><Text className="font-bold text-primary">Retry</Text></TouchableOpacity></View> : null}
            <ScrollView
                className="flex-1 p-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {orders.length === 0 ? (
                    <View className="flex-1 justify-center items-center mt-20">
                        <Text className="text-secondary">{error ? "Orders unavailable" : "No orders found"}</Text>
                    </View>
                ) : (
                    orders.map((order: any) => (
                        <View key={order._id} className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100">
                            <View className="flex-row justify-between mb-2">
                                <Text className="font-medium text-sm text-gray-400 ">Order ID : #{order._id}</Text>
                                <Text className="text-secondary text-xs">{new Date(order.createdAt).toLocaleDateString()}</Text>
                            </View>

                            <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                                <Text className="text-xs text-secondary font-bold mb-1">CUSTOMER</Text>
                                <Text className="text-primary font-medium">{order.user?.name || 'Unknown User'}</Text>
                                <Text className="text-secondary text-xs">{order.user?.email || 'No email'}</Text>
                                {!order.user && <Text className="text-xs text-gray-400 mt-1">ID: {order.user?._id || 'N/A'}</Text>}
                            </View>

                            <View className="mb-3 bg-gray-50 p-3 rounded-lg">
                                <Text className="text-xs text-secondary font-bold mb-1">SHIPPING ADDRESS</Text>
                                <Text className="text-primary text-xs">
                                    {order.shippingAddress?.street}, {order.shippingAddress?.city}
                                </Text>
                                <Text className="text-primary text-xs">
                                    {order.shippingAddress?.state}, {order.shippingAddress?.zipCode}, {order.shippingAddress?.country}
                                </Text>
                            </View>

                            <View className="mb-3">
                                <Text className="text-xs text-secondary font-bold mb-2">ITEMS</Text>
                                {order.items.map((item: any) => (
                                    <View key={item._id} className="flex-row justify-between mb-1">
                                        <Text className="text-secondary text-xs flex-1">
                                            {item.quantity}x {item.product?.name || item.name}
                                            {(item.size) && (
                                                <Text className="text-gray-400">
                                                    {" "}({item.size || '-'})
                                                </Text>
                                            )}
                                        </Text>
                                        <Text className="text-secondary text-xs font-bold">
                                            ${item.price.toFixed(2)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <View className="flex-row justify-between items-center mt-2 pt-3 border-t border-gray-100">
                                <Text className="text-primary font-bold text-lg">${order.totalAmount.toFixed(2)}</Text>

                                <TouchableOpacity
                                    onPress={() => openStatusModal(order)}
                                    className={`flex-row items-center px-4 py-2 rounded-full ${getStatusColor(order.orderStatus)}`}
                                >
                                    <Text className="text-xs font-bold mr-2 uppercase tracking-wide">{order.orderStatus}</Text>
                                    <Ionicons name="pencil" size={12} color="black" style={{ opacity: 0.5 }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* STATUS MODAL */}
            <Modal visible={statusModalVisible} animationType="fade" transparent onRequestClose={() => { if (!updating) setStatusModalVisible(false); }}>
                <TouchableWithoutFeedback onPress={() => { if (!updating) setStatusModalVisible(false); }}>
                    <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-2xl p-4 max-h-[60%]">
                            <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-gray-100">
                                <Text className="text-lg font-bold text-primary">
                                    Update Order Status
                                </Text>
                                <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.secondary} />
                                </TouchableOpacity>
                            </View>

                            {statusError ? <Text accessibilityRole="alert" className="mb-4 text-red-600">{statusError}</Text> : null}
                            {updating ? (
                                <View className="py-8">
                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                    <Text className="text-center text-secondary mt-2">Updating status...</Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={STATUSES}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${selectedOrder?.orderStatus === item ? "bg-primary/10" : "bg-gray-50"
                                                }`}
                                            onPress={() => updateStatus(item)}
                                        >
                                            <Text className={`font-medium capitalize ${selectedOrder?.orderStatus === item ? "text-primary font-bold" : "text-secondary"
                                                }`}>
                                                {item}
                                            </Text>
                                            {selectedOrder?.orderStatus === item && (
                                                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                            )}
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}
