import React, { useState } from "react";
import {
  DatePicker,
  Button,
  Card,
  Typography,
  message,
  Space,
  Table,
} from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { RangePicker } = DatePicker;
const { Title } = Typography;

export default function Reportes() {
  const navigate = useNavigate();
  const [dates, setDates] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loadingDatos, setLoadingDatos] = useState(false);

  const columnsVentas = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Fecha",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t) => dayjs(t).format("YYYY-MM-DD"),
    },
    { title: "Cliente", dataIndex: ["client", "name"], key: "cliente" },
    { title: "RTN", dataIndex: ["client", "rtn"], key: "rtn" },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (t) => `L. ${t?.toFixed(2) ?? "0.00"}`,
    },
  ];

  const columnsCompras = [
    { title: "ID", dataIndex: "id", key: "id" },
    {
      title: "Fecha",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t) => dayjs(t).format("YYYY-MM-DD"),
    },
    { title: "Proveedor", dataIndex: ["supplier", "name"], key: "proveedor" },
    { title: "RTN", dataIndex: ["supplier", "rtn"], key: "rtn" },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (t) => `L. ${t?.toFixed(2) ?? "0.00"}`,
    },
  ];

  const validarRango = () => {
    if (!dates || dates.length !== 2) {
      message.warning("Selecciona un rango de fechas válido.");
      return false;
    }
    return true;
  };

  const consultarDatos = async () => {
    if (!validarRango()) return;

    setLoadingDatos(true);
    const [from, to] = dates.map(d => d.format("YYYY-MM-DD"));

    try {
      const { data } = await apiClient.get("/api/reports/datos", { params: { from, to } });
      setVentas(data.ventas || []);
      setCompras(data.compras || []);
    } catch (error) {
      console.error("Error al consultar datos:", error);
      message.error("Ocurrió un error al obtener los datos.");
    } finally {
      setLoadingDatos(false);
    }
  };

  const descargarReporte = async (tipo, formato = "pdf") => {
    if (!validarRango()) return;
    const [from, to] = dates.map(d => d.format("YYYY-MM-DD"));
    try {
      const response = await apiClient.get(`/api/reports/${tipo}/export`, {
        params: { from, to, format: formato },
        responseType: "blob"
      });

      const mime = formato === "pdf" ? "application/pdf" : 
                   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const extension = formato === "pdf" ? "pdf" : "xlsx";

      const blob = new Blob([response.data], { type: mime });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte_${tipo}_${from}_a_${to}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error al descargar ${tipo.toUpperCase()}:`, error);
      message.error(`Error al descargar el archivo ${formato.toUpperCase()}.`);
    }
  };

  const totalVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  const totalCompras = compras.reduce((sum, c) => sum + (c.total || 0), 0);
  const diferencia = totalVentas - totalCompras;

  return (
    <Card>
      <Button type="default" onClick={() => navigate("/home")} style={{ marginBottom: 16 }}>
        Ir al inicio
      </Button>
      <Title level={2}>Reportes de Compras y Ventas</Title>

      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker onChange={setDates} format="YYYY-MM-DD" allowClear value={dates} />
        <Button type="primary" onClick={consultarDatos} loading={loadingDatos}>Consultar</Button>
        <Button onClick={() => descargarReporte("ventas", "pdf")} type="dashed">PDF Ventas</Button>
        <Button onClick={() => descargarReporte("ventas", "excel")} type="dashed">Excel Ventas</Button>
        <Button onClick={() => descargarReporte("compras", "pdf")} type="dashed">PDF Compras</Button>
        <Button onClick={() => descargarReporte("compras", "excel")} type="dashed">Excel Compras</Button>
      </Space>

      <Card title="Ventas" style={{ marginTop: 24 }}>
        <Table dataSource={ventas} columns={columnsVentas} rowKey="id" pagination={false} />
      </Card>

      <Card title="Compras" style={{ marginTop: 24 }}>
        <Table dataSource={compras} columns={columnsCompras} rowKey="id" pagination={false} />
      </Card>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>
          Total Ventas: <span style={{ color: "#389e0d" }}> L. {totalVentas.toFixed(2)}</span>
          <br />
          Total Compras: <span style={{ color: "#cf1322" }}>L. {totalCompras.toFixed(2)}</span>
          <br />
          Diferencia: <span style={{ color: diferencia >= 0 ? "green" : "red" }}>L. {diferencia.toFixed(2)}</span>
        </Title>
      </Card>
    </Card>
  );
}