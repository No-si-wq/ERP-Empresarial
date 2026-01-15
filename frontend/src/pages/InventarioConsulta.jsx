import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Select,
  Button,
  message,
  Tooltip,
  Space,
  Tabs,
  Input,
  Empty,
} from "antd";
import {
  ReloadOutlined,
  FileExcelOutlined,
  AppstoreOutlined,
  HomeOutlined,
  TeamOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { TabPane } = Tabs;

const InventarioConsulta = () => {
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState([]);
  const [tiendas, setTiendas] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(false);

  const productosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return term
      ? productos.filter((p) =>
          p.name?.toLowerCase().includes(term)
        )
      : productos;
  }, [busqueda, productos]);

  useEffect(() => {
    fetchTiendas();
  }, []);

  useEffect(() => {
    if (storeId !== null) {
      fetchProductos(storeId);
    }
  }, [storeId]);

  const fetchTiendas = async () => {
    try {
      const res = await apiClient.get("/api/stores");
      const data = Array.isArray(res.data) ? res.data : [];
      setTiendas(data);
      if (data.length > 0 && storeId === null) setStoreId(data[0].id);
    } catch (error) {
      console.error("Error al cargar tiendas:", error);
      message.error("Error al cargar tiendas");
    }
  };

  const fetchProductos = async (id) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/inventarios/tienda/${id}`);
      if (!Array.isArray(res.data)) throw new Error("Formato inválido");
      setProductos(res.data);
    } catch (error) {
      console.error("Error cargando productos:", error);
      setProductos([]);
      message.error("Error al cargar el inventario");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!productosFiltrados.length) {
      message.warning("No hay datos para exportar");
      return;
    }

    const rows = productosFiltrados.map((p) => ({
      Nombre: p.name,
      SKU: p.sku,
      Cantidad: p.quantity,
      "Costo sin impuesto": (p.costBase ?? 0).toFixed(2),
      "Costo con impuesto": (p.costFinal ?? 0).toFixed(2),
      "Precio sin impuesto": (p.priceBase ?? 0).toFixed(2),
      "Precio con impuesto": (p.priceFinal ?? 0).toFixed(2),
      Impuesto: p.tax?.percent != null ? `${(p.tax.percent * 100).toFixed(2)}%` : "0%",
      Categoría: p.category?.name || "Sin categoría",
      Tienda: p.store?.nombre || "Sin tienda",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), "ConsultaInventario.xlsx");
  };

  const renderPrice = (value) =>
    `L. ${!isNaN(Number(value)) ? Number(value).toFixed(2) : "0.00"}`;

  const renderTax = (tax) =>
    tax?.percent != null ? `(${(tax.percent * 100).toFixed(2)}%)` : "Sin impuesto";

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Código", dataIndex: "sku", key: "sku" },
    { title: "Cantidad", dataIndex: "quantity", key: "quantity" },
    { title: "Costo sin impuesto", dataIndex: "costBase", key: "costBase", render: renderPrice },
    { title: "Costo con impuesto", dataIndex: "costFinal", key: "costFinal", render: renderPrice },
    { title: "Precio sin impuesto", dataIndex: "priceBase", key: "priceBase", render: renderPrice },
    { title: "Precio con impuesto", dataIndex: "priceFinal", key: "priceFinal", render: renderPrice },
    { title: "Impuesto", dataIndex: "tax", key: "tax", render: renderTax },
    { title: "Categoría", dataIndex: "category", key: "category", render: (c) => c?.name || "Sin categoría" },
    { title: "Tienda", dataIndex: "store", key: "store", render: (s) => s?.nombre || "Sin tienda" },
  ];

  return (
    <div style={{ minHeight: "100vh", width: "100%", padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 1200, background: "#e7eaf6", borderRadius: 8, padding: 16 }}>
        <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 16 }}>
          <TabPane tab={<span><AppstoreOutlined /> Archivo</span>} key="1">
            <Space>
              <Tooltip title="Ir al inicio">
                <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>Inicio</Button>
              </Tooltip>
              <Tooltip title="Actualizar inventario">
                <Button icon={<ReloadOutlined />} onClick={() => fetchProductos(storeId)} disabled={!storeId}>
                  Actualizar
                </Button>
              </Tooltip>
              <Button onClick={exportToExcel} icon={<FileExcelOutlined />}>Excel</Button>
              <Input
                placeholder="Buscar..."
                prefix={<SearchOutlined />}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                allowClear
                style={{ width: 250 }}
              />
            </Space>
          </TabPane>
          <TabPane tab={<span><TeamOutlined /> Catálogos</span>} key="2" />
          <TabPane tab={<span><SettingOutlined /> Configuración</span>} key="3" />
        </Tabs>

        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>Seleccionar tienda:</span>
          <Select
            value={storeId}
            onChange={(value) => setStoreId(value)}
            style={{ width: 240 }}
            disabled={!tiendas.length}
            placeholder="No hay tiendas"
          >
            {tiendas.map((t) => (
              <Select.Option key={t.id} value={t.id}>{t.nombre}</Select.Option>
            ))}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={productosFiltrados}
          loading={loading}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 12 }}
          style={{ background: "white", borderRadius: 4 }}
          locale={{ emptyText: <Empty description="No hay productos" /> }}
        />
      </div>
    </div>
  );
};

export default InventarioConsulta;
