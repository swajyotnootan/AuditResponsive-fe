// services/axiosSetup.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

// Attach the JWT to every raw axios call.
// Do NOT set axios.defaults.baseURL — existing calls pass the full URL.
axios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (__DEV__ && err?.response?.status === 403) {
      console.warn(
        "🚫 403",
        err.config?.method?.toUpperCase(),
        err.config?.url,
        "token?",
        !!err.config?.headers?.Authorization,
      );
    }
    return Promise.reject(err);
  },
);

export default axios;
