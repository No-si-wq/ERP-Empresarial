import React from 'react';
import '@ant-design/v5-patch-for-react-19';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Home from './pages/Home';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import InventarioConsulta from './pages/InventarioConsulta';
import Clientes from "./pages/Clientes";
import Reportes from "./pages/Reportes";
import Proveedores from "./pages/Proveedores";
import PrivateRoute from './components/PrivateRoute';
import AuthProvider  from './hooks/AuthProvider';
import Categorias from './pages/Categorias';
import Usuarios from './pages/Usuarios';
import PanelVentas from './pages/PanelVentas';
import FacturasCompras from "./pages/FacturasCompras";
import PaymentMethods from './pages/PaymentMethods';
import CurrencyPage from './pages/CurrencyPage';
import TaxesPage from './pages/TaxesPage';
import TiendasUI from './pages/TiendasUI';
import UtilidadProducto from './pages/ReportesProducto';
import KardexProductos from './pages/Kardex';
import PagosClientes from './pages/pagosClientes';
import BackupButton from './pages/BackupButton';
import RestoreButton from './pages/RestoreButton';
import Permisos from './pages/Permissions';
import ScheduledBackups from './pages/ScheduleBackups';

function App() {

  return (
    <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/ventas" element={<PrivateRoute><Ventas /></PrivateRoute>} />
          <Route path="/compras" element={<PrivateRoute><Compras /></PrivateRoute>} />
          <Route path="/inventarioConsulta" element={<PrivateRoute><InventarioConsulta /></PrivateRoute>} />
          <Route path="/clientes" element={<PrivateRoute><Clientes /></PrivateRoute>} />
          <Route path="/proveedores" element={<PrivateRoute><Proveedores /></PrivateRoute>} />
          <Route path="/reportes" element={<PrivateRoute><Reportes /></PrivateRoute>} />
          <Route path="/categorias" element={<PrivateRoute><Categorias /></PrivateRoute>} />
          <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
          <Route path="/ventas/panel" element={<PrivateRoute><PanelVentas /></PrivateRoute>} />
          <Route path="/compras/facturas" element={<PrivateRoute><FacturasCompras /></PrivateRoute>} />
          <Route path='/formas-pago' element={<PrivateRoute><PaymentMethods /></PrivateRoute>} />
          <Route path='/monedas' element={<PrivateRoute><CurrencyPage/></PrivateRoute>} />
          <Route path='/impuestos' element={<PrivateRoute><TaxesPage/></PrivateRoute>} />
          <Route path='/tiendas' element={<PrivateRoute><TiendasUI/></PrivateRoute>} />
          <Route path='/utilidad' element={<PrivateRoute><UtilidadProducto/></PrivateRoute>} />
          <Route path='/kardex' element={<PrivateRoute><KardexProductos/></PrivateRoute>} />
          <Route path='/pagos-cliente' element={<PrivateRoute><PagosClientes/></PrivateRoute>} />
          <Route path='/backup' element={<PrivateRoute><BackupButton/></PrivateRoute>} />
          <Route path='/restore' element={<PrivateRoute><RestoreButton/></PrivateRoute>} />
          <Route path='/permisos' element={<PrivateRoute><Permisos/></PrivateRoute>} />
          <Route path='/scheduled-backups' element={<PrivateRoute><ScheduledBackups/></PrivateRoute>} />
          {/* Default route */}
          <Route 
            path="/home" 
            element={
              <PrivateRoute>
                <Home/>
              </PrivateRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/home" />} />
        </Routes>
    </AuthProvider>
  );
}

export default App;