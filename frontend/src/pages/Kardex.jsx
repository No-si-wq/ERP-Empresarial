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
  Tag,
} from "antd";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

export default function KardexProducto() {
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(true);
  const [dates, setDates] = useState([]);
  const [datosKardex, setDatosKardex] = useState(null);
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [tiendas, setTiendas] = useState([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    { title: "Fecha", dataIndex: "fecha", key: "fecha", width: 120 },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 160,
      onCell: () => ({
        style: { whiteSpace: "normal", wordBreak: "break-word" },
      }),
    },
    { title: "Referencia", dataIndex: "referencia", key: "referencia", width: 120 },
    { title: "Caja", dataIndex: "caja", key: "caja", width: 180 },
    {
      title: "Entradas",
      dataIndex: "entradas",
      key: "entradas",
      align: "right",
      render: (t) => (t > 0 ? t : ""),
    },
    {
      title: "Salidas",
      dataIndex: "salidas",
      key: "salidas",
      align: "right",
      render: (t) => (t > 0 ? t : ""),
    },
    {
      title: "Existencia",
      dataIndex: "existencia",
      key: "existencia",
      align: "right",
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get("/api/stores");
        setTiendas(res.data);
      } catch {
        message.error("Error al cargar tiendas");
      }
    })();
  }, []);

  useEffect(() => {
    if (!tiendaSeleccionada) {
      setProductos([]);
      setProductoSeleccionado(null);
      return;
    }

    (async () => {
      try {
        const res = await apiClient.get(`/api/inventario/by-store/${tiendaSeleccionada}`);
        setProductos(res.data || []);
      } catch {
        message.error("Error al cargar productos");
      }
    })();
  }, [tiendaSeleccionada]);

  const validarFormulario = () => {
    if (!tiendaSeleccionada) return message.warning("Selecciona una tienda."), false;
    if (!dates || dates.length !== 2) return message.warning("Selecciona un rango de fechas válido."), false;
    if (!productoSeleccionado) return message.warning("Selecciona un producto."), false;
    return true;
  };

  const consultarKardex = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    const [from, to] = dates.map((d) => d.format("YYYY-MM-DD"));

    try {
      const { data } = await apiClient.get("/api/reports/kardex-producto", {
        params: {
          from,
          to,
          storeId: tiendaSeleccionada,
          productId: productoSeleccionado,
        },
      });

      if (!data || !data.movimientos?.length) {
        message.info("No se encontraron movimientos para este producto.");
        setMovimientos([]);
        setDatosKardex(null);
        return;
      }

      const movimientosPlano = data.movimientos.map((m) => ({
        fecha: m.fecha,
        tipo: m.tipo,
        referencia: m.referencia,
        caja: m.caja,
        entradas: m.entradas ?? 0,
        salidas: m.salidas ?? 0,
        existencia: m.existencia ?? 0,
      }));

      setMovimientos(movimientosPlano);
      setDatosKardex(data);
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      message.error("Error al obtener el Kardex");
    } finally {
      setLoading(false);
    }
  };

  const descargarReporte = async (formato) => {
    if (!validarFormulario()) return;
    const [from, to] = dates.map((d) => d.format("YYYY-MM-DD"));

    try {
      const response = await apiClient.get("/api/reports/kardex-por-producto/export", {
        params: {
          from,
          to,
          storeId: tiendaSeleccionada,
          productId: productoSeleccionado,
          format: formato,
        },
        responseType: "blob",
      });

      const mime =
        formato === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = formato === "pdf" ? "pdf" : "xlsx";

      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kardex_${from}_a_${to}.${extension}`;
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
      {/* 🪟 Modal de filtros */}
      <Modal
        title="Kardex de Producto"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button
            key="restaurar"
            onClick={() => {
              setDates([]);
              setProductoSeleccionado(null);
              setTiendaSeleccionada(null);
              setMovimientos([]);
              setDatosKardex(null);
            }}
          >
            Restaurar
          </Button>,
          <Button key="cancelar" onClick={() => setModalVisible(false)}>
            Cancelar
          </Button>,
          <Button key="aceptar" type="primary" onClick={consultarKardex} loading={loading}>
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
            showSearch
            optionFilterProp="children"
          >
            {tiendas.map((t) => (
              <Option key={t.id} value={t.id}>
                {t.nombre}
              </Option>
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
            placeholder="Selecciona un producto"
            style={{ width: "100%" }}
            value={productoSeleccionado}
            onChange={setProductoSeleccionado}
            showSearch
            optionFilterProp="children"
            disabled={!tiendaSeleccionada}
          >
            {productos
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.name}
                </Option>
              ))}
          </Select>
        </Space>
      </Modal>

      {/* 🧾 Resultados */}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => navigate("/home")}>Ir al inicio</Button>
          <Button type="primary" onClick={consultarKardex} loading={loading}>
            Consultar Kardex
          </Button>
          <Button onClick={() => setModalVisible(true)}>Cambiar filtros</Button>
          <Button onClick={() => descargarReporte("excel")} type="dashed">
            Exportar Excel
          </Button>
        </Space>

        <Title level={3}>Kardex del Producto</Title>

        <Table
          dataSource={movimientos}
          columns={columns}
          rowKey={(r, idx) => `${r.fecha}-${r.tipo}-${idx}`}
          pagination={false}
          loading={loading}
        />

        {datosKardex && (
          <Card style={{ marginTop: 24, background: "#fafafa" }}>
            <Title level={4}>Resumen del Kardex</Title>
            <p>
              <strong>Producto:</strong> {datosKardex.producto.nombre}
            </p>
            <p>
              <strong>Periodo:</strong> {datosKardex.periodo.desde} a {datosKardex.periodo.hasta}
            </p>
            <ul>
              <li>Saldo inicial: {datosKardex.saldoInicial}</li>
              <li>Total entradas: {datosKardex.totalEntradas}</li>
              <li>Total salidas: {datosKardex.totalSalidas}</li>
              <li>Existencia final calculada: {datosKardex.existenciaFinal}</li>
            </ul>
          </Card>
        )}
      </Card>
    </>
  );
}