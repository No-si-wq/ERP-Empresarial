import React, { useState, useEffect } from "react";
import { Layout, Tabs, Typography, message } from "antd";
import {
  ShopOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  PercentageOutlined,
} from "@ant-design/icons";
import { useTiendas } from "../hooks/useTiendas";
import {
  createStore,
  updateStore,
  deleteStore,
  fetchInventarioByStore,
  fetchCajasByStore,
} from "../api/storesAPI";
import SidebarMenu from "../components/SidebarMenu";
import InventarioView from "../components/InventarioView";
import CajasView from "../components/CajasView";

const { Sider, Content } = Layout;
const { Title } = Typography;

const getIcon = (iconName) => {
  switch (iconName) {
    case "shop":
      return <ShopOutlined />;
    case "appstore":
      return <AppstoreOutlined />;
    case "database":
      return <DatabaseOutlined />;
    case "percentage":
      return <PercentageOutlined />;
    default:
      return null;
  }
};

const TiendasUI = () => {
  const { treeData, setTreeData, fetchTiendas } = useTiendas();
  const [selectedKey, setSelectedKey] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const loadStores = fetchTiendas;
  
  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    const storeId = extractStoreIdFromKey(selectedKey);
    setSelectedStoreId(storeId);

      if (!selectedKey?.includes("-inventario") && storeId){
        fetchInventarioByStore(storeId)
          .then(setInventario)
          .catch(() => setInventario([]));
        } 

        if (!selectedKey?.includes("-cajas") && storeId){
          fetchCajasByStore(storeId)
            .then(setCajas)
            .catch(() => setCajas([]));
          } 

      if (!selectedKey) {
        setSelectedStoreId(null);
        return;
      }

    const match = selectedKey.match(/^store-(\d+)/);
      if (match) {
        setSelectedStoreId(parseInt(match[1]));
      } else {
        setSelectedStoreId(null);
      }
  }, [selectedKey]);

  const extractStoreIdFromKey = (key) => {
    const match = key?.match(/^store-(\d+)-/);
    return match ? parseInt(match[1]) : null;
  };

  const extractStoreClave = (id) => {
    const tienda = treeData.find((t) => t.id === id);
    return tienda?.clave ?? null;
  };

  const handleCreate = async (data) => {
    try {
      await createStore(data);
      await fetchTiendas();
      message.success("Tienda creada con éxito");
    } catch (error) {
      console.error(error);
      message.error("Error al crear tienda");
    }
  };

  const handleUpdate = async (id, values) => {
    try {
      await updateStore(id, values);
      await fetchTiendas();
      message.success("Tienda actualizada");
    } catch (error) {
      console.error(error);
      message.error("Error al actualizar tienda");
    }
  };

  const handleDelete = async () => {
    const storeId = extractStoreIdFromKey(selectedKey);
    const clave = extractStoreClave(storeId);

    if (!clave) {
      message.error("No se pudo encontrar la tienda seleccionada");
      return;
    }

    try {
      await deleteStore(clave);
      await fetchTiendas();
      if (selectedKey?.includes(clave)) {
        setSelectedKey(null);
      }
      message.success("Tienda eliminada");
    } catch (error) {
      console.error(error);
      message.error("No se pudo eliminar la tienda");
    }
  };

  const renderContent = () => {
    if (!selectedKey) return <Title level={4}>Seleccione una tienda o módulo</Title>;

    const modulo = selectedKey.split("-")[2];
    switch (modulo) {
      case "inventario":
        return <InventarioView storeId={selectedStoreId} />;
      case "cajas":
        return <CajasView storeId={selectedStoreId} />;
      case "politicas":
        return <p>Políticas aquí</p>;
      default:
        return <p>Resumen</p>;
    }
  };

  const renderTreeWithIcons = (data) =>
    data.map((node) => ({
      ...node,
      icon: getIcon(node.icon),
      children: node.children ? renderTreeWithIcons(node.children) : [],
    }));

  const renderedTreeData = renderTreeWithIcons(treeData);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={300} theme="light" style={{ padding: "16px 0" }}>
        <SidebarMenu
          treeData={renderedTreeData}
          selectedKey={selectedKey}
          onSelect={(keys) => setSelectedKey(keys[0])}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReload={loadStores}
          selectedStoreId={selectedStoreId}
        />
      </Sider>
      <Layout>
        <Content style={{ padding: 24 }}>
          <Tabs
            defaultActiveKey="1"
            type="card"
            items={[
              {
                key: "1",
                label: "Gestión",
                children: renderContent(),
              },
              {
                key: "2",
                label: "Configuración",
                children: <p>Configuración</p>,
              },
            ]}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default TiendasUI;