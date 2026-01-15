import React, { createContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import apiClient, { setLogoutHandler } from "../api/axios";
import { useApi } from "../context/ApiContext";

export const AuthContext = createContext(null);

const EMPTY_AUTH = {
  token: null,
  roleId: null,
  username: null,
  permissions: [],
};

const AuthProvider = ({ children }) => {
  const { ready: apiReady, checkHealth } = useApi();

  const [auth, setAuth] = useState(EMPTY_AUTH);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const resolveSessionFromToken = useCallback(async (token) => {
    const decoded = jwtDecode(token);
    const { roleId, username, exp } = decoded;

    if (!exp || Date.now() >= exp * 1000) {
      throw new Error("Token expirado");
    }

    try {
      const res = await apiClient.get(`/api/roles/${roleId}`);
      const permissions = res.data.permissions.map(p => p.key);

      setAuth({
        token,
        roleId,
        username,
        permissions,
      });

    } catch (err) {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("token");
        setAuth(EMPTY_AUTH);
      } else {
        console.error("Error cargando permisos:", err);
        setAuth({
          token,
          roleId,
          username,
          permissions: [],
        });
      }
    }
  }, []);

  useEffect(() => {
    if (!apiReady) return;

    const initAuth = async () => {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setIsAuthReady(true);
        return;
      }

      const health = await checkHealth();

      if (health?.status !== "ok") {
        console.error("Backend no saludable:", health);
        sessionStorage.removeItem("token");
        setAuth(EMPTY_AUTH);
        setIsAuthReady(true);
        return;
      }

      try {
        await resolveSessionFromToken(token);
      } catch (err) {
        console.error("Error resolviendo sesión:", err);
        sessionStorage.removeItem("token");
        setAuth(EMPTY_AUTH);
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, [apiReady, checkHealth, resolveSessionFromToken]);

  const handleLogin = async ({ token }) => {
    sessionStorage.setItem("token", token);
    await resolveSessionFromToken(token);
  };

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("token");
    setAuth(EMPTY_AUTH);
  }, []);

  useEffect(() => {
    setLogoutHandler(handleLogout);
  }, [handleLogout]);

  return (
    <AuthContext.Provider
      value={{
        auth,
        isAuthReady,
        isAuthenticated: !!auth.token,
        handleLogin,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;