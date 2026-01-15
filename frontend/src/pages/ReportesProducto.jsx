import React, { useState, useEffect } from "react";
import {
  DatePicker,
  Select,
  Button,
  Card,
  Typography,
  message,
  Space,
  Table,
  Modal,
} from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { RangePicker } = DatePicker;
const { Title } = Typography;
const { Option } = Select;

export default function UtilidadProducto() {
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(true);
  const [dates, setDates] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productoInicial, setProductoInicial] = useState(null);
  const [productoFinal, setProductoFinal] = useState(null);
  const [tiendas, setTiendas] = useState([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState(null);
  const [utilidades, setUtilidades] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    { title: "Fecha", dataIndex: "fecha", key: "fecha", render: t => dayjs(t).format("YYYY-MM-DD") },
    { title: "Producto", dataIndex: "producto", key: "producto" },
    { title: "Cantidad", dataIndex: "cantidad", key: "cantidad", render: t => t ?? 0 },
    { title: "Precio Unitario", dataIndex: "precioUnitario", key: "precioUnitario", render: t => `L. ${Number(t).toFixed(2)}` },
    { title: "Costo Unitario", dataIndex: "costoUnitario", key: "costoUnitario", render: t => `L. ${Number(t).toFixed(2)}` },
    { title: "Precio Total", dataIndex: "precioTotal", key: "precioTotal", render: t => `L. ${t ? t.toFixed(2) : "0.00"}` },
    { title: "Costo Total", dataIndex: "costoTotal", key: "costoTotal", render: t => `L. ${t ? t.toFixed(2) : "0.00"}` },
    { title: "Utilidad", dataIndex: "utilidad", key: "utilidad", render: t => `L. ${t ? t.toFixed(2) : "0.00"}` },
    { title: "% Utilidad", dataIndex: "porcentajeUtilidad", key: "porcentajeUtilidad", render: t => `${t.toFixed(2)}%` },
  ];

  useEffect(() => {
    const fetchTiendas = async () => {
      try {
        const resTiendas = await apiClient.get("/api/stores");
        setTiendas(resTiendas.data);
      } catch (err) {
        message.error("Error al cargar tiendas");
        console.error(err);
      }
    };
    fetchTiendas();
  }, []);

  useEffect(() => {
    if (!tiendaSeleccionada) return;

    const fetchProductosPorTienda = async () => {
      try {
        const res = await apiClient.get(`/api/inventario/by-store/${tiendaSeleccionada}`);
        setProductos(res.data);
        setProductoInicial(null);
        setProductoFinal(null);
      } catch (err) {
        message.error("Error al cargar productos de la tienda");
        console.error(err);
      }
    };

    fetchProductosPorTienda();
  }, [tiendaSeleccionada]);

  const validarFormulario = () => {
    if (!tiendaSeleccionada) {
      message.warning("Selecciona una tienda.");
      return false;
    }
    if (!dates || dates.length !== 2) {
      message.warning("Selecciona un rango de fechas válido.");
      return false;
    }
    if (!productoInicial || !productoFinal) {
      message.warning("Selecciona un producto inicial y final.");
      return false;
    }
    if (Number(productoFinal) < Number(productoInicial)) {
      message.warning("El producto final debe ser mayor o igual al inicial.");
      return false;
    }
    return true;
  };

  const consultarUtilidad = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    const [from, to] = dates.map(d => d.format("YYYY-MM-DD"));

    try {
      const { data } = await apiClient.get("/api/reports/venta-utilidad-por-producto", {
        params: {
          from,
          to,
          productStart: productoInicial,
          productEnd: productoFinal,
          storeId: tiendaSeleccionada,
        },
      });
      setUtilidades(data || []);
      setModalVisible(false);
    } catch (err) {
      console.error("Error al consultar utilidad:", err);
      message.error("No se pudieron obtener los datos");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setDates([]);
    setProductoInicial(null);
    setProductoFinal(null);
    setTiendaSeleccionada(null);
  };

  const descargarReporte = async (formato) => {
    if (!validarFormulario()) return;

    const [from, to] = dates.map(d => d.format("YYYY-MM-DD"));

    try {
      const response = await apiClient.get("/api/reports/venta-utilidad-por-producto/export", {
        params: {
          from,
          to,
          productStart: productoInicial,
          productEnd: productoFinal,
          storeId: tiendaSeleccionada,
          format: formato
        },
        responseType: "blob"
      });

      const mime = formato === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = formato === "pdf" ? "pdf" : "xlsx";

      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `venta_utilidad_${from}_a_${to}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error al descargar ${formato.toUpperCase()}:`, err);
      message.error(`Error al descargar el archivo ${formato.toUpperCase()}`);
    }
  };

  return (
    <>
      <Modal
        title="Parámetros de Consulta"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="restaurar" onClick={limpiarFormulario}>
            Restaurar
          </Button>,
          <Button key="cancelar" onClick={() => setModalVisible(false)}>
            Cancelar
          </Button>,
          <Button key="aceptar" type="primary" onClick={consultarUtilidad} loading={loading}>
            Aceptar
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Select
            placeholder="Selecciona una tienda"
            style={{ width: "100%" }}
            value={tiendaSeleccionada}
            onChange={setTiendaSeleccionada}
          >
            {tiendas.map(t => (
              <Option key={t.id} value={t.id}>{t.nombre}</Option>
            ))}
          </Select>

          <RangePicker
            onChange={setDates}
            format="YYYY-MM-DD"
            allowClear
            value={dates}
            style={{ width: "100%" }}
          />

          <Select
            placeholder="Producto inicial"
            style={{ width: "100%" }}
            value={productoInicial}
            onChange={value => { setProductoInicial(value); setProductoFinal(null); }}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
          {productos
            .sort((a, b) => a.id - b.id)
            .map((p) => (
              <Option key={p.id} value={p.id}>{p.name}</Option>
            ))}
          </Select>

          <Select
            placeholder="Producto final"
            style={{ width: "100%" }}
            value={productoFinal}
            onChange={setProductoFinal}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {productos
              .filter(p => !productoInicial || p.id >= productoInicial)
              .map(p => (
                <Option key={p.id} value={p.id}>{p.name}</Option>
              ))}
          </Select>
        </Space>
      </Modal>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="default" onClick={() => navigate("/home")}>Ir al inicio</Button>
          <Button type="primary" onClick={consultarUtilidad} loading={loading}>Consultar Utilidad</Button>
          <Button onClick={() => setModalVisible(true)}>Cambiar filtros</Button>
          <Button onClick={() => descargarReporte("excel")} type="dashed">Exportar Excel</Button>
        </Space>
        <Title level={3}>Resultados de Utilidad</Title>
        <Table
          dataSource={utilidades}
          columns={columns}
          rowKey={(r, i) => `${r.producto}-${r.fecha}-${i}`}
          pagination={false}
          loading={loading}
        />
      </Card>
    </>
  );
}