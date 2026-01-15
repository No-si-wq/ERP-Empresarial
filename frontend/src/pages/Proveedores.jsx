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
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../hooks/AuthProvider";
import apiClient from '../api/axios';

const { TabPane } = Tabs;

const Proveedores = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/proveedores');
      setProveedores(res.data); 
    } catch {
      message.error("Error al cargar proveedores");
    }
    setLoading(false);
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedProveedor(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = () => {
    if (!selectedProveedor) return;
    setEditMode(true);
    form.setFieldsValue(selectedProveedor);
    setModalVisible(true);
  };

  const onDelete = () => {
    if (!selectedProveedor) return;
    Modal.confirm({
      title: "¿Está seguro que desea eliminar el proveedor?",
      content: `Proveedor: ${selectedProveedor.name}`,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await apiClient.delete(`/api/proveedores/${selectedProveedor.id}`);
          message.success("Proveedor eliminado");
          setSelectedProveedor(null);
          fetchProveedores();
        } catch {
          message.error("No se pudo eliminar el proveedor");
        }
      },
    });
  };

  const onFinish = async (values) => {
    if (editMode && selectedProveedor) {
      // Editar
      try {
        await apiClient.put(`/api/proveedores/${selectedProveedor.id}`, values);
        message.success("Proveedor actualizado");
      } catch {
        message.error("No se pudo actualizar el proveedor");
      }
    } else {
      // Crear
      try {
        await apiClient.post('/api/proveedores', values);
        message.success("Proveedor añadido");
      } catch {
        message.error("No se pudo añadir el proveedor");
      }
    }

    setModalVisible(false);
    form.resetFields();
    setSelectedProveedor(null);
    fetchProveedores();
  };

  const columns = [
    { title: "Código", dataIndex: "id", key: "id" },
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "RTN", dataIndex: "rtn", key: "rtn" },
    { title: "Correo", dataIndex: "email", key: "email" },
    { title: "Teléfono", dataIndex: "phone", key: "phone" },
    { title: "Dirección", dataIndex: "address", key: "address" },
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
          <Tooltip title="Agregar proveedor">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Añadir
            </Button>
          </Tooltip>
          <Tooltip title="Editar proveedor">
            <Button icon={<EditOutlined />} disabled={!selectedProveedor} onClick={openEditModal}>
              Editar
            </Button>
          </Tooltip>
          <Tooltip title="Eliminar proveedor">
            {canDelete && 
              (<Button danger icon={<DeleteOutlined />} disabled={!selectedProveedor} 
              onClick={onDelete}>
                Eliminar
              </Button>)}
          </Tooltip>
          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={fetchProveedores}>
              Actualizar
            </Button>
          </Tooltip>
        </Space>
      </TabPane>
      <TabPane tab={<span><TeamOutlined /> Catálogos</span>} key="2">
        <Space><Button icon={<SearchOutlined />}>Buscar</Button></Space>
      </TabPane>
      <TabPane tab={<span><SettingOutlined /> Configuración</span>} key="3">
        <Space><Button icon={<SettingOutlined />}>Opciones</Button></Space>
      </TabPane>
    </Tabs>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f5ff 0%, #fffbe6 100%)", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", background: "#f9f9f9", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #dbeafe50" }}>
        {ribbonActions}
        <Table
          columns={columns}
          dataSource={proveedores}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => setSelectedProveedor(record),
          })}
          rowClassName={(record) => (selectedProveedor?.id === record.id ? "ant-table-row-selected" : "")}
          style={{ background: "white", borderRadius: 4 }}
        />
      </div>

      <Modal
        title={editMode ? "Editar Proveedor" : "Añadir Proveedor"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedProveedor(null);
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
        </Form>
      </Modal>
    </div>
  );
};

export default Proveedores;