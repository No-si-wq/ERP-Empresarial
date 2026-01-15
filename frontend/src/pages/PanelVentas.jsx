import React, { useEffect, useState } from "react";
import { Table, Typography, Button, Menu, Space, Tag, message, Popconfirm } from "antd";
import {
  ReloadOutlined, HomeOutlined, StopOutlined, EditOutlined, PlusCircleOutlined, } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from '../api/axios';

const { Title } = Typography;

const PanelVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/ventas/admin');
      setVentas(res.data.ventas || res.data);  
      setTotal(res.data.total || res.data.length);
    } catch (e) {
      message.error("No se pudieron cargar las ventas", e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  const cancelarVenta = async () => {
    if (!selectedVenta || selectedVenta.estado !== "EMITIDA") return;

    try {
      await apiClient.patch(`/api/ventas/${selectedVenta.id}/cancel`);
      message.success("Venta cancelada");
      setSelectedVenta(null);
      fetchVentas();
    } catch (e) {
      message.error("No se pudo cancelar la venta", e.message);
    }
  };

  const columns = [
    {
      title: "Folio",
      dataIndex: "folio",
      key: "folio",
      render: (f) => <Tag color="blue">{f}</Tag>,
    },
    {
      title: "Caja",
      dataIndex: "caja",
      key: "caja",
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      render: (fecha) =>
        fecha ? new Date(fecha).toLocaleString() : "Sin fecha",
    },
    {
      title: "Cliente",
      dataIndex: "cliente",
      key: "cliente",
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (total) => `L. ${Number(total).toFixed(2)}`,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado) => {
        let color = "green";
        if (estado === "CANCELADA") color = "red";
        else if (estado === "PENDIENTE") color = "blue";

        return <Tag color={color}>{estado}</Tag>;
      },
    },
  ];

  const ribbon = (
    <Menu mode="horizontal" style={{ marginBottom: 8 }}>
      <Menu.Item key="recargar" icon={<ReloadOutlined />} onClick={fetchVentas}>
        Recargar
      </Menu.Item>
      <Menu.Item
        key="inicio"
        icon={<HomeOutlined />}
        onClick={() => navigate("/home")}
        style={{ float: "right" }}
      >
        Ir al inicio
      </Menu.Item>
    </Menu>
  );

  const actionsBar = (
    <Space style={{ marginBottom: 16 }}>
      <Button
        type="primary"
        icon={<PlusCircleOutlined />}
        onClick={() => navigate(`/ventas`)}
      >
        Añadir
      </Button>
      <Button
        type="primary"
        icon={<EditOutlined />}
        onClick={() => navigate(`/ventas?id=${selectedVenta?.id}`)}
        disabled={!selectedVenta || selectedVenta.estado !== "PENDIENTE"}
      >
        Editar
      </Button>
      <Popconfirm
        title="¿Estás seguro de cancelar esta venta?"
        onConfirm={cancelarVenta}
        okText="Sí, cancelar"
        cancelText="No"
        disabled={!selectedVenta || selectedVenta.estado !== "EMITIDA"}
      >
        <Button
          danger
          icon={<StopOutlined />}
          disabled={!selectedVenta || selectedVenta.estado !== "EMITIDA"}
        >
          Cancelar
        </Button>
      </Popconfirm>
    </Space>
  );

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "32px auto",
        background: "#fff",
        borderRadius: 8,
        padding: 24,
        boxShadow: "0 2px 8px #d5deef",
        minHeight: "70vh"
      }}
    >
      {ribbon}
      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Panel de Ventas
        </Title>
        {actionsBar}
      </Space>
      <Table
        dataSource={ventas}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage }}
        bordered
        scroll={{ x: true }}
        onRow={(record) => ({
          onClick: () => setSelectedVenta(record),
          onDoubleClick: () => navigate(`/ventas?id=${record.id}&view=true`)
        })}
        rowClassName={(record) =>
          selectedVenta?.id === record.id ? "ant-table-row-selected" : ""
        }
      />
    </div>
  );
};

export default PanelVentas;