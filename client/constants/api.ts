import axios from "axios";
import { Platform } from "react-native";

const LOCAL_API_URL = Platform.select({
  android: "http://192.168.8.114:3000/api",
  ios: "http://192.168.8.114:3000/api",
  default: "http://localhost:3000/api",
});

const api = axios.create({
  baseURL: (process.env.EXPO_PUBLIC_API_URL || LOCAL_API_URL)?.replace(/\/+$/, ""),
});

export default api;