import React, { useEffect, useState } from "react";
import { Table, Typography, Tag, Space, Menu, message, Button, Popconfirm } from "antd";
import { ReloadOutlined, HomeOutlined, StopOutlined, EditOutlined, PlusCircleOutlined, } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from '../api/axios';

const { Title } = Typography;

const FacturasCompras = () => {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchCompras = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/compras/admin');
      setCompras(res.data.ventas || res.data); 
      setTotal(res.data.total || res.data.length);
    } catch (e) {
      message.error("No se pudieron cargar las compras", e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  const cancelarCompra = async () => { 
    if (!selectedCompra || selectedCompra.estado !== "EMITIDA") return;

    try {
      await apiClient.patch(`/api/compras/${selectedCompra.id}/cancel`);
      message.success("Compra cancelada");
      setSelectedCompra(null);
      fetchCompras();
    } catch (e) {
      console.error("Error al cancelar la compra:", e);
      message.error("No se pudo cancelar la compra");
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
      title: "Proveedor",
      dataIndex: "proveedor",
      key: "proveedor",
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
      <Menu.Item key="recargar" icon={<ReloadOutlined />} onClick={fetchCompras}>
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
        onClick={() => navigate(`/compras`)}
      >
        Añadir
      </Button>
      <Button
        type="primary"
        icon={<EditOutlined />}
        onClick={() => navigate(`/compras?id=${selectedCompra.id}`)}
        disabled={!selectedCompra || selectedCompra.estado !== "PENDIENTE"}
      >
        Editar
      </Button>
      <Popconfirm
        title="¿Estás seguro de cancelar esta compra?"
        onConfirm={cancelarCompra}
        okText="Sí, cancelar"
        cancelText="No"
        disabled={!selectedCompra || selectedCompra.estado !== "EMITIDA"}
      >
        <Button
          danger
          icon={<StopOutlined />}
          disabled={!selectedCompra || selectedCompra.estado !== "EMITIDA"}
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
          Facturas de Compras
        </Title>
        {actionsBar}
      </Space>
      <Table
        dataSource={compras}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage }}
        bordered
        scroll={{ x: true }}
        onRow={(record) => ({
          onClick: () => setSelectedCompra(record),
          onDoubleClick: () => navigate(`/compras?id=${record.id}&view=true`),
        })}
        rowClassName={(record) =>
          selectedCompra?.id === record.id ? "ant-table-row-selected" : ""
        }
      />
    </div>
  );
};

export default FacturasCompras;