import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../hooks/AuthProvider';

const PrivateRoute = ({ children }) => {
  const { auth, setAuth } = useContext(AuthContext);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const checkAuth = setTimeout(() => {
      setIsAuthReady(true);
    }, 100); 

    return () => clearTimeout(checkAuth);
  }, [setAuth]);

  if (!isAuthReady) {
    return <div>Cargando...</div>; 
  }

  if (!auth || !auth.token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
