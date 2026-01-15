import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Select,
  Space,
  Typography,
  Card,
} from "antd";
import {
  DollarOutlined,
  ReloadOutlined,
  PlusOutlined,
  HomeOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { Title, Text } = Typography;

const PagosClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [metodosPago, setMetodosPago] = useState([]); 
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchClientes = async () => {
    try {
      const res = await apiClient.get("/api/clientes");
      setClientes(res.data);
    } catch (error) {
      console.error("Error al cargar clientes", error);
      message.error("Error al cargar clientes");
    }
  };

  useEffect(() => {
    const fetchMetodosPago = async () => {
      try {
        const res = await apiClient.get("/api/payment-methods");
        setMetodosPago(res.data.data || []);
      } catch (error) {
        console.error("Error cargando métodos de pago", error);
        message.error("No se pudieron cargar los métodos de pago");
      }
    };
    fetchMetodosPago();
  }, []);

  const fetchPagos = async (clientId) => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/payments/${clientId}`);
      setPagos(res.data.payments || []);
      setSelectedCliente(res.data); 
    } catch (error) {
      console.error("Error al cargar pagos", error);
      message.error("Error al cargar pagos");
    }
    setLoading(false);
  };

  const handleRegistrarPago = async (values) => {
    const monto = parseFloat(values.amount);
    if (selectedCliente.creditBalance <= 0) {
      message.error("El cliente no tiene saldo pendiente para pagar");
      return;
    }

    if (monto > selectedCliente.creditBalance) {
      message.error("El monto ingresado excede el saldo pendiente del cliente");
      return;
    }
    try {
      await apiClient.post("/api/payments", {
        clientId: selectedCliente.id,
        amount: monto,
        paymentMethodId: values.paymentMethodId,
        type: 'PAY',
      });
      message.success("Pago registrado exitosamente");
      setModalVisible(false);
      form.resetFields();
      fetchPagos(selectedCliente.id);
      fetchClientes();
    } catch (error) {
      console.error("Error al registrar pago", error.response?.data || error.message);
      message.error(error.response?.data?.error || "Error al registrar pago");
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const pagoColumns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Monto", dataIndex: "amount", key: "amount" },
    {
      title: "Método de Pago",
      dataIndex: ["payment_method", "descripcion"],
      key: "paymentMethod",
    },
    {
      title: "Fecha",
      dataIndex: "date",
      key: "date",
      render: (text) => new Date(text).toLocaleString(),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(135deg, #f0f5ff 0%, #fffbe6 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          background: "#fff",
          padding: 16,
          borderRadius: 8,
          boxShadow: "0 2px 8px #dbeafe50",
        }}
      >
        <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
          Inicio
        </Button>
        <Title level={3}>
          <DollarOutlined /> Gestión de Pagos de Clientes
        </Title>
        <Space style={{ marginBottom: 16 }}>
          <Select
            showSearch
            placeholder="Seleccionar cliente"
            style={{ width: 300 }}
            onChange={(id) => fetchPagos(id)}
            optionFilterProp="children"
          >
            {clientes.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name} (Saldo: {c.creditBalance})
              </Select.Option>
            ))}
          </Select>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!selectedCliente}
            onClick={() => setModalVisible(true)}
          >
            Registrar Pago
          </Button>
          <Button
            icon={<ReloadOutlined />}
            disabled={!selectedCliente}
            onClick={() => fetchPagos(selectedCliente?.id)}
          >
            Actualizar
          </Button>
        </Space>

        {selectedCliente && (
          <Card style={{ marginBottom: 16 }} title="Estado de Crédito">
            <Text>
              <b>Límite:</b> {selectedCliente.creditLimit} |{" "}
            </Text>
            <Text>
              <b>Saldo:</b> {selectedCliente.creditBalance} |{" "}
            </Text>
            <Text>
              <b>Días:</b> {selectedCliente.creditDays}
            </Text>
          </Card>
        )}

        <Table
          columns={pagoColumns}
          dataSource={pagos}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </div>

      <Modal
        title="Registrar Pago"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleRegistrarPago}>
          <Form.Item
            name="amount"
            label="Monto"
            rules={[{ required: true, message: "Ingrese el monto" }]}
          >
            <Input type="number" />
          </Form.Item>
          <Form.Item
            name="paymentMethodId"
            label="Método de Pago (ID)"
            rules={[{ required: true, message: "Ingrese el método de pago" }]}
          >
          <Select placeholder="Seleccionar método de pago">
            {metodosPago
              .filter(mp => mp.clave !== "CRED")
              .map(mp => (
                <Select.Option key={mp.id} value={mp.id}>
                  {mp.descripcion}
                </Select.Option>
              ))}
          </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PagosClientes;