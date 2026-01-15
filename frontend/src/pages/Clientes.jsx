import React, { useEffect, useState, useContext } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Tabs,
  Space,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  HomeOutlined,
  EditOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  SearchOutlined,
  TeamOutlined,
  SettingOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";
import { AuthContext } from "../hooks/AuthProvider";

const { TabPane } = Tabs;

const Clientes = () => {
  const { auth } = useContext(AuthContext);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewDays, setRenewDays] = useState("");
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetDays, setResetDays] = useState("");


  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/clientes");
      setClientes(res.data);
    } catch (error) {
      console.error("Error al cargar clientes", error);
      message.error("Error al cargar clientes");
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedCliente(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = () => {
    if (!selectedCliente) return;
    setEditMode(true);
    form.setFieldsValue({
      name: selectedCliente.name,
      rtn: selectedCliente.rtn,
      email: selectedCliente.email,
      phone: selectedCliente.phone,
      address: selectedCliente.address,
      creditLimit: selectedCliente.creditLimit,
      creditBalance: selectedCliente.creditBalance,
      creditDays: selectedCliente.creditDays,
    });
    setModalVisible(true);
  };

  const onFinish = async (values) => {
    try {
      let payload;

      if(editMode){
        payload = {
          name: values.name,
          rtn: values.rtn,
          email: values.email,
          phone: values.phone,
          address: values.address,
          creditLimit: Number(values.creditLimit) || 0,
        };
      } else {
        payload = {
          ...values,
          creditLimit: Number(values.creditLimit) || 0,
          creditBalance: Number(values.creditBalance) || 0,
          creditDays: Number(values.creditDays) || 0,
        };
      }
      if (editMode) {
        await apiClient.put(`/api/clientes/${selectedCliente.id}`, payload);
        message.success("Cliente actualizado exitosamente");
      } else {
        await apiClient.post("/api/clientes", payload);
        message.success("Cliente añadido exitosamente");
      }
      setModalVisible(false);
      fetchClientes();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
      message.error("Error al guardar cliente");
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/api/clientes/${id}`);
      message.success("Cliente eliminado exitosamente");
      fetchClientes();
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      message.error("Error al eliminar cliente");
    }
  };

  const handleRenewCredit = async () => {
    if (!selectedCliente) {
      message.warning("Selecciona un cliente primero");
      return;
    }

    const days = Number(renewDays);

    if (isNaN(days) || days <= 0) {
      message.warning("Ingresa una cantidad válida de días");
      return;
    }

    try {
      await apiClient.patch(
        `/api/clientes/${selectedCliente.id}/renew-credit`,
        { extraDays: days }
      );

      message.success(`Crédito renovado por ${days} días adicionales`);
      setRenewModalVisible(false);
      setRenewDays("");
      fetchClientes();
    } catch (error) {
      console.error("Error al renovar crédito:", error.response?.data || error);
      message.error(error.response?.data?.error || "No se pudo renovar el crédito");
    }
  };

  const handleResetCredit = async () => {
    if (!selectedCliente) {
      message.warning("Selecciona un cliente primero");
      return;
    }

    const days = Number(resetDays);

    if (isNaN(days) || days <= 0) {
      message.warning("Ingresa una cantidad válida de días");
      return;
    }

    try {
      await apiClient.patch(
        `/api/clientes/${selectedCliente.id}/reset-credit-days`,
        { newCreditDays: days }
      );

      message.success(`Crédito restablecido a ${days} días`);
      setResetModalVisible(false);
      setResetDays("");
      fetchClientes();
    } catch (error) {
      console.error("Error al restablecer crédito:", error.response?.data || error);
      message.error(error.response?.data?.error || "Error inesperado");
    }
  };

  const columns = [
    { title: "Código", dataIndex: "id", key: "id" },
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "RTN", dataIndex: "rtn", key: "rtn" },
    { title: "Correo", dataIndex: "email", key: "email" },
    { title: "Teléfono", dataIndex: "phone", key: "phone" },
    { title: "Dirección", dataIndex: "address", key: "address" },
    { title: "Límite Crédito", dataIndex: "creditLimit", key: "creditLimit" },
    { title: "Saldo Crédito", dataIndex: "creditBalance", key: "creditBalance" },
    { title: "Días Crédito", dataIndex: "creditDays", key: "creditDays" },
  ];

  const ribbonActions = (
    <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 16 }}>
      <TabPane tab={<span><AppstoreOutlined /> Archivo</span>} key="1">
        <Space wrap>
          <Tooltip title="Ir al inicio">
            <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
              Inicio
            </Button>
          </Tooltip>

          <Tooltip title="Agregar cliente">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Añadir
            </Button>
          </Tooltip>

          <Tooltip title="Editar cliente">
            <Button icon={<EditOutlined />} disabled={!selectedCliente} onClick={openEditModal}>
              Editar
            </Button>
          </Tooltip>

          <Tooltip title="Eliminar cliente">
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedCliente}
                onClick={() => handleDelete(selectedCliente.id)}
              >
                Eliminar
              </Button>
            )}
          </Tooltip>

          <Tooltip title="Renovar días de crédito">
            <Button
              icon={<SyncOutlined />}
              disabled={!selectedCliente}
              onClick={() => setRenewModalVisible(true)}
            >
              Renovar crédito
            </Button>
          </Tooltip>

          <Tooltip title="Restablecer días de crédito">
            <Button
              icon={<ReloadOutlined />}
              disabled={!selectedCliente}
              onClick={() => setResetModalVisible(true)}
            >
              Restablecer crédito
            </Button>
          </Tooltip>

          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={fetchClientes}>
              Actualizar
            </Button>
          </Tooltip>
        </Space>
      </TabPane>

      <TabPane tab={<span><TeamOutlined /> Catálogos</span>} key="2">
        <Space>
          <Button icon={<SearchOutlined />}>Buscar</Button>
        </Space>
      </TabPane>

      <TabPane tab={<span><SettingOutlined /> Configuración</span>} key="3">
        <Space>
          <Button icon={<SettingOutlined />}>Opciones</Button>
        </Space>
      </TabPane>
    </Tabs>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0f5ff 0%, #fffbe6 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          background: "#f9f9f9",
          borderRadius: 8,
          padding: 16,
          boxShadow: "0 2px 8px #dbeafe50",
        }}
      >
        {ribbonActions}
        <Table
          columns={columns}
          dataSource={clientes}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => setSelectedCliente(record),
          })}
          rowClassName={(record) =>
            selectedCliente?.id === record.id ? "ant-table-row-selected" : ""
          }
          style={{ background: "white", borderRadius: 4 }}
        />
      </div>

      <Modal
        title={editMode ? "Editar Cliente" : "Añadir Cliente"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="rtn" label="RTN" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Correo">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Teléfono" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Dirección" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="creditLimit" label="Límite de Crédito">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="creditBalance" label="Saldo de Crédito">
            <Input type="number" disabled />
          </Form.Item>
          <Form.Item name="creditDays" label="Días de Crédito">
            <Input type="number" disabled={editMode} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Renovar crédito de ${selectedCliente?.name || ""}`}
        open={renewModalVisible}
        onCancel={() => {
          setRenewModalVisible(false);
          setRenewDays("");
        }}
        onOk={handleRenewCredit}
        okText="Renovar"
      >
        <p>Ingresa los días adicionales que deseas agregar al crédito actual.</p>
        <Input
          type="number"
          placeholder="Ejemplo: 15"
          value={renewDays}
          onChange={(e) => setRenewDays(e.target.value)}
        />
      </Modal>
      <Modal
        title={`Restablecer crédito de ${selectedCliente?.name || ""}`}
        open={resetModalVisible}
        onCancel={() => {
          setResetModalVisible(false);
          setResetDays("");
        }}
        onOk={handleResetCredit}
        okText="Restablecer"
      >
        <p>Ingresa el nuevo valor de días de crédito para restablecer el límite.</p>
        <Input
          type="number"
          placeholder="Ejemplo: 30"
          value={resetDays}
          onChange={(e) => setResetDays(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default Clientes;