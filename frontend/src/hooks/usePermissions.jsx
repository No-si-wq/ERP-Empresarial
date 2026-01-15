import { useContext, useMemo } from "react";
import { AuthContext } from "./AuthProvider";

import {
  DollarOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  UserOutlined,
  TeamOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  ShopOutlined,
  CreditCardOutlined,
  DesktopOutlined,
  ApartmentOutlined,
  TagsOutlined,
  GlobalOutlined,
  FileOutlined,
  StockOutlined,
  SyncOutlined,
  SettingOutlined,
  SaveOutlined,
  RollbackOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";

const rawModules = [
  {
    key: "ventas",
    title: "Ventas",
    icon: <DollarOutlined />,
    submenu: [
      { key: "panel-ventas", title: "Panel de ventas", icon: <FileAddOutlined />, path: "/ventas/panel" },
      { key: "Punto ventas", title: "Punto de venta", icon: <ShoppingCartOutlined />, path: "/ventas" },
      { key: "clientes", title: "Clientes", icon: <UserOutlined />, path: "/clientes" },
      { key: "credito-clientes", title: "Cuentas por Cobrar", icon: <UserOutlined />, path: "/pagos-cliente" },
    ]
  },
  {
    key: "compras",
    title: "Compras",
    icon: <ShoppingCartOutlined />,
    submenu: [
      { key: "Registro compras", title: "Registro de compras", icon: <ShoppingCartOutlined />, path: "/compras" },
      { key: "facturas-compras", title: "Panel de compras", icon: <FileAddOutlined />, path: "/compras/facturas" },
      { key: "proveedores", title: "Proveedores", icon: <TeamOutlined />, path: "/proveedores" }
    ]
  },
  {
    key: "catalogos",
    title: "Catálogos",
    icon: <FolderOpenOutlined />,
    submenu: [
      { key: "tiendas", title: "Tiendas", icon: <ShopOutlined />, path: "/tiendas" },
      { key: "usuarios", title: "Usuarios", icon: <UserOutlined />, path: "/usuarios" },
      { key: "permisos", title: "Crear Permisos", icon: <UserOutlined />, path: "/permisos" },
      { key: "formas-pago", title: "Formas de pago", icon: <CreditCardOutlined />, path: "/formas-pago" },
      { key: "categorias", title: "Categorías", icon: <FileOutlined />, path: "/categorias" },
      { key: "monedas", title: "Monedas", icon: <GlobalOutlined />, path: "/monedas" },
      { key: "impuestos", title: "Esquema de Impuestos", icon: <FileTextOutlined />, path: "/impuestos" },
    ]
  },
  {
    key: "inventario",
    title: "Inventario",
    icon: <AppstoreOutlined />,
    submenu: [
      { key: "Panel inventario", title: "Panel de inventario", icon: <FileSearchOutlined />, path: "/inventarioConsulta" },
      { key: "kardex", title: "Kardex", icon: <SyncOutlined />, path: "/kardex" }
    ]
  },
  {
    key: "reportes",
    title: "Reportes",
    icon: <BarChartOutlined />,
    submenu: [
      { key: "Panel reportes", title: "Panel de reportes", icon: <BarChartOutlined />, path: "/reportes" },
      { key: "utilidades", title: "Ventas y Utilidades", icon: <StockOutlined />, path: "/utilidad" }
    ]
  },
    {
    key: "configuracion",
    title: "Configuracion",
    icon: <SettingOutlined />,
    submenu: [
      { key: "backup", title: "Generacion de Respaldos", icon: <SaveOutlined />, path: "/backup" },
      { key: "restore", title: "Restauracion de Respaldos", icon: <RollbackOutlined />, path: "/restore" },
      { key: "scheduled-backups", title: "Jobs de respaldos programados", icon: <CloudUploadOutlined />, path: "/scheduled-backups" }
    ]
  },
];

export const usePermissions = () => {
  const { auth } = useContext(AuthContext);
  const permissions = auth?.permissions || [];

  const filteredModules = useMemo(() => {
    return rawModules
      .map((mod) => {
        const submenu = mod.submenu?.filter((item) =>
          permissions.includes(item.path)
        ) || [];
        return submenu.length > 0 ? { ...mod, submenu } : null;
      })
      .filter(Boolean);
  }, [permissions]);

  return { modules: filteredModules };
};