import React, { useEffect, useState, useContext } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Checkbox,
  Typography,
  Space,
  message,
  Tabs,
  Tooltip,
} from "antd";

import {
  HomeOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  TeamOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";
import { AuthContext } from "../hooks/AuthProvider";

const { Title } = Typography;
const { TabPane } = Tabs;

const PermissionsPage = () => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");

  const [modalRoleVisible, setModalRoleVisible] = useState(false);
  const [modalPermVisible, setModalPermVisible] = useState(false);

  const [editingRole, setEditingRole] = useState(null);

  const [formRole] = Form.useForm();
  const [formPerm] = Form.useForm();
  const [form] = Form.useForm();

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await apiClient.get("/api/roles", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setRoles(res.data);
    } catch (err) {
      console.error(err);
      message.error("Error al obtener roles");
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchPermissions = async () => {
    setLoadingPerms(true);
    try {
      const res = await apiClient.get("/api/permissions", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setPermissions(res.data);
    } catch (err) {
      console.error(err);
      message.error("Error al obtener permisos");
    } finally {
      setLoadingPerms(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleSaveRole = async (values) => {
    try {
      const payload = {
        name: values.name,
        description: values.description || "",
      };

      if (editingRole) {
        await apiClient.put(`/api/roles/${editingRole.id}`, payload, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        message.success("Rol actualizado");
      } else {
        await apiClient.post("/api/roles", payload, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        message.success("Rol creado");
      }

      formRole.resetFields();
      setEditingRole(null);
      setModalRoleVisible(false);
      fetchRoles();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.error || "Error al guardar rol");
    }
  };

  const onDeleteRole = async () => {
    if (!selectedRole) return;

    Modal.confirm({
      title: "¿Eliminar este rol?",
      okText: "Sí",
      cancelText: "No",
      onOk: async () => {
        try {
          await apiClient.delete(`/api/roles/${selectedRole.id}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          });
          message.success("Rol eliminado");
          setSelectedRole(null);
          fetchRoles();
        } catch (err) {
          console.error(err);
          message.error(err.response?.data?.error || "Error al eliminar rol");
        }
      },
    });
  };

  const openPermissionsModal = (role) => {

    form.setFieldsValue({
      permissions: (role.permissions || []).map((p) => p.permission?.id ?? p.id),
    });

    Modal.confirm({
      title: `Asignar permisos a "${role.name}"`,
      okText: "Guardar",
      cancelText: "Cancelar",
      width: 600,
      onOk: async () => {
        try {
          const values = await form.validateFields();
          const permissionIds = values.permissions || [];

          await apiClient.put(
            `/api/permissions/role/${role.id}`,
            { permissionIds },
            { headers: { Authorization: `Bearer ${auth.token}` } }
          );

          const updated = await apiClient.get(
            `/api/permissions/role/${role.id}`,
            { headers: { Authorization: `Bearer ${auth.token}` } }
          );
          role.permissions = updated.data;

          message.success("Permisos actualizados");
          fetchRoles();
        } catch (err) {
          console.error(err);
          message.error("Error al asignar permisos");
        }
      },
      content: (
      <Form form={form} layout="vertical">
        <Form.Item name="permissions">
          <Checkbox.Group style={{ display: "flex", flexDirection: "column" }}>
            {permissions.map((p) => (
              <Checkbox key={p.id} value={p.id}>
                {p.key} - {p.description}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>
      </Form>
      ),
    });
  };

  const handleCreatePermission = async (values) => {
    try {
      await apiClient.post("/api/permissions", values, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      message.success("Permiso creado");
      formPerm.resetFields();
      setModalPermVisible(false);
      fetchPermissions();
    } catch (err) {
      console.error(err);
      message.error("Error al crear permiso");
    }
  };

  const onDeletePermission = async () => {
    if (!selectedPermission) return;

    Modal.confirm({
      title: "¿Eliminar este permiso?",
      okText: "Sí",
      cancelText: "No",
      onOk: async () => {
        try {
          await apiClient.delete(`/api/permissions/${selectedPermission.id}`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          });
          message.success("Permiso eliminado");
          setSelectedPermission(null);
          fetchPermissions();
        } catch (err) {
          console.error(err);
          message.error("Error al eliminar permiso");
        }
      },
    });
  };

  const roleColumns = [
    { title: "ID", dataIndex: "id" },
    { title: "Nombre", dataIndex: "name" },
    { title: "Descripción", dataIndex: "description" },
    {
      title: "Permisos",
      render: (_, r) =>
        r.permissions?.map(p => p.permission?.key ?? p.key).join(", "),
    },
  ];

  const permColumns = [
    { title: "ID", dataIndex: "id" },
    { title: "Key", dataIndex: "key" },
    { title: "Descripción", dataIndex: "description" },
  ];

  const ribbon = (
    <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 16 }}>
      <TabPane tab={<span><AppstoreOutlined /> Archivo</span>} key="1">
        <Space wrap>

          <Tooltip title="Ir al inicio">
            <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
              Inicio
            </Button>
          </Tooltip>

          <Tooltip title="Agregar rol">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                formRole.resetFields();
                setEditingRole(null);
                setModalRoleVisible(true);
              }}
            >
              Añadir Rol
            </Button>
          </Tooltip>

          <Tooltip title="Editar rol">
            <Button
              icon={<EditOutlined />}
              disabled={!selectedRole}
              onClick={() => {
                if (!selectedRole) return;
                formRole.setFieldsValue(selectedRole);
                setEditingRole(selectedRole);
                setModalRoleVisible(true);
              }}
            >
              Editar Rol
            </Button>
          </Tooltip>

          <Tooltip title="Eliminar rol">
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedRole}
                onClick={onDeleteRole}
              >
                Eliminar Rol
              </Button>
              )}
          </Tooltip>

          <Tooltip title="Asignar permisos">
            <Button
              type="default"
              icon={<TeamOutlined />}
              disabled={!selectedRole}
              onClick={() => openPermissionsModal(selectedRole)}
            >
              Permisos
            </Button>
          </Tooltip>

          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={fetchRoles}>
              Actualizar
            </Button>
          </Tooltip>
        </Space>
      </TabPane>

      <TabPane tab={<span><TeamOutlined /> Catálogo Permisos</span>} key="2">
        <Space wrap>

          <Tooltip title="Nuevo permiso">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalPermVisible(true)}
            >
              Añadir Permiso
            </Button>
          </Tooltip>

          <Tooltip title="Eliminar permiso">
            {canDelete && (
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedPermission}
                onClick={onDeletePermission}
              >
                Eliminar Permiso
              </Button>
            )}
          </Tooltip>

          <Tooltip title="Actualizar">
            <Button icon={<ReloadOutlined />} onClick={fetchPermissions}>
              Actualizar
            </Button>
          </Tooltip>
        </Space>
      </TabPane>

      <TabPane tab={<span><SettingOutlined /> Configuración</span>} key="3">
        <span>Opciones de configuración generales aquí.</span>
      </TabPane>
    </Tabs>
  );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 1300,
          margin: "0 auto",
          background: "#fafafa",
          padding: 16,
          borderRadius: 8,
          boxShadow: "0 2px 8px #dbeafe50",
        }}
      >
        <Title level={3}>Gestión de Roles y Permisos</Title>

        {ribbon}

        <Tabs defaultActiveKey="roles">
          <TabPane tab="Roles" key="roles">
            <Table
              dataSource={roles}
              columns={roleColumns}
              rowKey="id"
              loading={loadingRoles}
              bordered
              onRow={(record) => ({
                onClick: () => setSelectedRole(record),
              })}
              rowClassName={(record) =>
                selectedRole?.id === record.id ? "ant-table-row-selected" : ""
              }
            />
          </TabPane>

          <TabPane tab="Permisos" key="permissions">
            <Table
              dataSource={permissions}
              columns={permColumns}
              rowKey="id"
              loading={loadingPerms}
              bordered
              onRow={(record) => ({
                onClick: () => setSelectedPermission(record),
              })}
              rowClassName={(record) =>
                selectedPermission?.id === record.id ? "ant-table-row-selected" : ""
              }
            />
          </TabPane>
        </Tabs>
      </div>

      <Modal
        open={modalRoleVisible}
        title={editingRole ? "Editar Rol" : "Nuevo Rol"}
        onCancel={() => setModalRoleVisible(false)}
        footer={null}
      >
        <Form form={formRole} layout="vertical" onFinish={handleSaveRole}>
          <Form.Item
            label="Nombre"
            name="name"
            rules={[{ required: true, message: "Ingresa el nombre del rol" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Descripción" name="description">
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modalPermVisible}
        title="Nuevo Permiso"
        onCancel={() => setModalPermVisible(false)}
        footer={null}
      >
        <Form form={formPerm} layout="vertical" onFinish={handleCreatePermission}>
          <Form.Item
            label="Key"
            name="key"
            rules={[{ required: true, message: "Ingresa la clave del permiso" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Descripción" name="description">
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Crear
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionsPage;