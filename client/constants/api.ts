import axios from "axios";

const DEFAULT_API_URL = "https://ecom-native-app-server-psi.vercel.app/api";

const api = axios.create({
  baseURL: (process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, ""),
});

export default api;
