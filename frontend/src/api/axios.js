import axios from "axios";

let logoutHandler = null;

export function setLogoutHandler(fn) {
  logoutHandler = fn;
}

const apiClient = axios.create({
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (!config.baseURL) {
      return Promise.reject(
        new Error("Backend no está listo (baseURL no configurada)")
      );
    }

    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        code: "BACKEND_OFFLINE",
        message: "No se pudo conectar con el servidor",
        originalError: error,
      });
    }

    const { status, data } = error.response;

    if (status === 401) {
      sessionStorage.removeItem("token");
      logoutHandler?.();
    }

    if (status >= 500) {
      console.error(
        "ERROR SERVIDOR:",
        data?.message || data?.error || "Error interno"
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;