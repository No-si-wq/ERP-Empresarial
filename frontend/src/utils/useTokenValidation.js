import { useEffect, useState, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../hooks/AuthProvider';
import apiClient from '../api/axios';

export function useTokenValidation() {
  const [isValid, setIsValid] = useState(null);
  const { auth, setAuth } = useContext(AuthContext);

  useEffect(() => {
    const validateToken = async () => {
      if (!auth || !auth.token) {
        setIsValid(false);
        return;
      }

      try {
        const decoded = jwtDecode(auth.token);
        const isExpired = decoded.exp * 1000 < Date.now();
        if (isExpired) {
          localStorage.clear();
          setAuth(null);
          setIsValid(false);
          return;
        }

        try {
          const res = await apiClient.get('/api/auth/validate');
          if (res.status === 200) {
            const data = res.data;
            localStorage.setItem('user', data.username);
            localStorage.setItem('role', data.role || '');
            setIsValid(true);
          } else {
            // El backend no validó el token por alguna razón
            localStorage.clear();
            setAuth(null);
            setIsValid(false);
          }
        } catch (fetchErr) {
          console.error('Fallo en la llamada de validación:', fetchErr);
          localStorage.clear();
          setAuth(null);
          setIsValid(false);
        }
      } catch (err) {
        console.error('Formato de token inválido:', err);
        localStorage.clear();
        setAuth(null);
        setIsValid(false);
      }
    };

    validateToken();
  }, [auth, setAuth]);

  return { isValid };
}
