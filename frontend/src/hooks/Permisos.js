import { useContext } from 'react';
import { AuthContext } from './AuthProvider';

export function usePermissions() {
  const { auth } = useContext(AuthContext);

  const role = auth?.role;

  return {
    canDeletepaymentMethods: role === 'admin',
    canDeleteTaxes: role === 'admin',
    canDeleteMonedas: role === 'admin',
    canDeleteCategorias: role === 'admin',
    canDeleteClientes: role === 'admin',
    canDeleteProveedores: role === 'admin',
    // ...otros permisos
  };
}
