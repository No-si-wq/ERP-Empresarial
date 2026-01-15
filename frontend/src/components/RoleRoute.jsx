import { Navigate, useLocation } from 'react-router-dom';
import { useTokenValidation } from '../utils/useTokenValidation';
import { useAuth } from '../hooks/AuthProvider';
import { canAccess } from '../permissions/permissions';

const RoleRoute = ({ children }) => {
  const isValid = useTokenValidation();
  const { auth } = useAuth();
  const location = useLocation();

  if (isValid === null) return <div>Cargando...</div>;

  const role = auth?.role;
  const path = location.pathname;

  if (!isValid || !auth || !canAccess(role, path)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
