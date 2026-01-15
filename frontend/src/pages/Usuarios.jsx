import React, { useEffect, useState, useContext } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Space,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../hooks/AuthProvider";
import apiClient from "../api/axios";

const { TabPane } = Tabs;

const Usuarios = () => {
  const { auth } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/usuarios");
      const normalizados = res.data.map(u => ({
        ...u,
        role: u.role || { id: null, name: "—" }
      }));
      setUsuarios(normalizados);
    } catch {
      message.error("Error al cargar usuarios");
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get("/api/roles");
      setRoles(res.data);
    } catch {
      message.error("Error al cargar roles");
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, []);

  const onDelete = async () => {
    if (!selectedUsuario) return;
    Modal.confirm({
      title: "¿Está seguro que desea eliminar el usuario?",
      content: `Usuario: ${selectedUsuario.username}`,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await apiClient.delete(`/api/usuarios/${selectedUsuario.id}`);
          message.success("Usuario eliminado");
          setSelectedUsuario(null);
          fetchUsuarios();
        } catch {
          message.error("No se pudo eliminar el usuario");
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditMode(false);
    setSelectedUsuario(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = () => {
    if (!selectedUsuario) return;

    setEditMode(true);

    form.setFieldsValue({
      username: selectedUsuario.username,
      email: selectedUsuario.email,
      password: "",
      roleId: selectedUsuario.role?.id,
    });

    setModalVisible(true);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const dataToSend = {
        username: values.username,
        email: values.email,
        roleId: Number(values.roleId),
      };

      if (!editMode || values.password) {
        dataToSend.password = values.password;
      }

      if (editMode && selectedUsuario) {
        await apiClient.put(
          `/api/usuarios/${selectedUsuario.id}`,
          dataToSend
        );
        message.success("Usuario actualizado exitosamente");
      } else {
        await apiClient.post("/api/usuarios", dataToSend);
        message.success("Usuario creado exitosamente");
      }

      setModalVisible(false);
      fetchUsuarios();
      form.resetFields();
      setSelectedUsuario(null);
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Error al guardar el usuario";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Usuario", dataIndex: "username", key: "username" },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Rol",
      dataIndex: ["role", "name"],
      key: "role",
      render: (_, record) => record.role?.name ?? "—",
    },
    {
      title: "Creado",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => new Date(v).toLocaleString(),
    },
  ];

  const ribbonActions = (
    <Tabs
      defaultActiveKey="1"
      type="card"
      style={{ marginBottom: 24 }}
    >
      <TabPane
        tab={
          <span>
            <UserOutlined />
            Archivo
          </span>
        }
        key="1"
      >
        <Space>
          <Tooltip title="Ir al inicio">
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate("/home")}
              style={{ background: "#f5f5f5" }}
            >
              Inicio
            </Button>
          </Tooltip>

          <Tooltip title="Agregar usuario">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              Añadir
            </Button>
          </Tooltip>

          <Tooltip title="Editar usuario">
            <Button
              icon={<EditOutlined />}
              disabled={!selectedUsuario}
              onClick={openEditModal}
            >
              Editar
            </Button>
          </Tooltip>

          <Tooltip title="Eliminar usuario">
            {canDelete && 
              (<Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedUsuario}
                onClick={onDelete}
              >
                Eliminar
              </Button>)}
          </Tooltip>

          <Tooltip title="Actualizar lista">
            <Button icon={<ReloadOutlined />} onClick={fetchUsuarios}>
              Actualizar
            </Button>
          </Tooltip>
        </Space>
      </TabPane>

      <TabPane
        tab={
          <span>
            <TeamOutlined />
            Acciones
          </span>
        }
        key="2"
      >
        <Space>
          <Button icon={<SearchOutlined />}>Buscar</Button>
        </Space>
      </TabPane>

      <TabPane
        tab={
          <span>
            <SettingOutlined />
            Configuración
          </span>
        }
        key="3"
      >
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
        width: "100%",
        background: "linear-gradient(135deg, #f0f5ff 0%, #fffbe6 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          background: "#e7eaf6",
          borderRadius: 8,
          boxShadow: "0 2px 8px #dbeafe50",
          padding: 16,
        }}
      >
        {ribbonActions}

        <Table
          columns={columns}
          dataSource={usuarios}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => setSelectedUsuario(record),
          })}
          rowClassName={(record) =>
            selectedUsuario?.id === record.id
              ? "ant-table-row-selected"
              : ""
          }
          style={{ background: "white", borderRadius: 4 }}
        />
      </div>

      {/* MODAL */}
      <Modal
        title={editMode ? "Editar Usuario" : "Añadir Usuario"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedUsuario(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="username"
            label="Usuario"
            rules={[{ required: true, message: "Ingrese el nombre de usuario" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Ingrese el correo electrónico" },
              { type: "email", message: "Correo no válido" },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label={editMode ? "Nueva contraseña" : "Contraseña"}
            rules={[
              { required: !editMode, message: "Ingrese la contraseña" },
            ]}
          >
            <Input.Password
              placeholder={editMode ? "Dejar vacío para mantener la contraseña actual" : "Ingrese la contraseña"}
            />
          </Form.Item>

          <Form.Item
            name="roleId"
            label="Rol"
            rules={[{ required: true, message: "Seleccione un rol" }]}
          >
            <Select placeholder="Seleccione un rol">
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Usuarios;