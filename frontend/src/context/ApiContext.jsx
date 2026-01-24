import { createContext, useContext, useEffect, useState, useCallback } from "react";
import apiClient from "../api/axios";

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(null);
  const [ready, setReady] = useState(false);
  const [healthStatus, setHealthStatus] = useState("checking");

  const checkHealth = useCallback(async (baseUrl, retries = 5) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) throw new Error("Health failed");

        setHealthStatus("ok");
        setReady(true);
        return;
      } catch {
        setHealthStatus("checking");
        setReady(false);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setHealthStatus("error");
    setReady(false);
  }, []);

  useEffect(() => {
    window.api.getBackendInfo().then(info => {
      if (!info?.port) return;

      const url = `http://localhost:${info.port}`;
      apiClient.defaults.baseURL = url;
      setApiBaseUrl(url);

      checkHealth(url);
    });

    const handler = (_, { port }) => {
      const url = `http://localhost:${port}`;
      apiClient.defaults.baseURL = url;
      setApiBaseUrl(url);

      setHealthStatus("checking");
      setReady(false);

      checkHealth(url);
    };

    window.api.onBackendReady(handler);
    return () => window.api.offBackendReady(handler);
  }, [checkHealth]);

  const retryHealth = async () => {
    if (!apiBaseUrl) return;
    setHealthStatus("checking");
    await checkHealth(apiBaseUrl);
  };

  return (
    <ApiContext.Provider
      value={{
        apiBaseUrl,
        ready,
        healthStatus,
        retryHealth,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  return useContext(ApiContext);
}