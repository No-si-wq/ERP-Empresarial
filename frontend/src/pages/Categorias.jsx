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
import apiClient from "../api/axios";
import { AuthContext } from "../hooks/AuthProvider";

const { TabPane } = Tabs;

const Categorias = () => {
  const { auth } = useContext(AuthContext);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/categorias');
      setCategorias(res.data); 
    } catch {
      message.error("Error al cargar categorías");
    }
    setLoading(false);
  };

  const onDelete = async () => {
    if (!selectedCategoria) return;
    Modal.confirm({
      title: "¿Está seguro que desea eliminar la categoría?",
      content: `Categoría: ${selectedCategoria.name}`,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await apiClient.delete(`/api/categorias/${selectedCategoria.id}`);
          message.success("Categoría eliminada");
          setSelectedCategoria(null);
          fetchCategorias();
        } catch {
          message.error("No se pudo eliminar la categoría");
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedCategoria(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = () => {
    if (!selectedCategoria) return;
    setEditMode(true);
    form.setFieldsValue({
      name: selectedCategoria.name,
    });
    setModalVisible(true);
  };

  const onFinish = async (values) => {
    try {
      if (editMode) {
        await apiClient.put(`/api/categorias/${selectedCategoria.id}`, values);
        message.success("Categoría actualizada exitosamente");
      } else {
        await apiClient.post("/api/categorias", values);
        message.success("Categoría añadida exitosamente");
      }
      setModalVisible(false);
      form.resetFields();
      setSelectedCategoria(null);
      fetchCategorias();
    } catch (err) {
      message.error("Error al guardar la categoría", err);
    }
  };


  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
  ];

  const ribbonActions = (
    <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 16 }}>
      <TabPane tab={<span><AppstoreOutlined /> Archivo</span>} key="1">
        <Space>
          <Tooltip title="Ir al inicio">
            <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
              Inicio
            </Button>
          </Tooltip>
          <Tooltip title="Agregar categoría">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Añadir
            </Button>
          </Tooltip>
          <Tooltip title="Editar categoría">
            <Button icon={<EditOutlined />} disabled={!selectedCategoria} onClick={openEditModal}>
              Editar
            </Button>
          </Tooltip>
          <Tooltip title="Eliminar categoría">
            {canDelete && (
              <Button danger icon={<DeleteOutlined />} 
                disabled={!selectedCategoria} 
                onClick={onDelete}>
                Eliminar
              </Button>
            )}
          </Tooltip>
          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={fetchCategorias}>
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
      <div style={{ maxWidth: 1000, margin: "0 auto", background: "#e7eaf6", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px #dbeafe50" }}>
        {ribbonActions}
        <Table
          columns={columns}
          dataSource={categorias}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
          onClick: () => setSelectedCategoria(record),
        })}
        rowClassName={(record) => (selectedCategoria?.id === record.id ? "ant-table-row-selected" : "")}
          style={{ background: "white", borderRadius: 4 }}
        />
      </div>

      <Modal
        title={editMode ? "Editar Categoría" : "Añadir Categoría"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedCategoria(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: "Ingrese el nombre de la categoría" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categorias;