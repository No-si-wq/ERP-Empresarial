import { useState, useContext } from "react";
import {
  Tree,
  Button,
  Typography,
  Space,
  Divider,
  Modal,
  Form,
  Input,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { fetchStoreById, updateStore, deleteStore } from "../api/storesAPI";
import { AuthContext } from "../hooks/AuthProvider";
import apiClient from "../api/axios";

const { Title } = Typography;

const SidebarMenu = ({
  treeData,
  onSelect,
  onCreate,
  selectedKey,
  selectedStoreId,
  onReload,
}) => {
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const isStoreKeySelected = selectedKey?.startsWith("store-");

  const validateClave = async (_, value) => {
    if (!value || editMode) return Promise.resolve();
    try {
      const { data } = await apiClient.get(`/api/stores/check-clave/${value}`);
      if (data.exists) {
        Modal.error({
          title: 'Clave duplicada',
          content: `La clave "${value}" ya está registrada.`,
          okText: 'Aceptar'
        });
        return Promise.reject(new Error('La clave ya existe'));
      }
      return Promise.resolve();
    } catch (error) {
      console.error("Error de validación de clave:", error);
      Modal.error({
        title: 'Error de validación',
        content: 'No se pudo verificar la clave en este momento.',
        okText: 'Aceptar'
      });
      return Promise.reject(new Error('Error al validar clave'));
    }
  };

  const openCreateModal = async () => {
    form.resetFields();
    setEditMode(false);
    try {
      const { data } = await apiClient.get(`/api/stores/next-clave`);
      form.setFieldsValue({ clave: data.clave });
    } catch (error) {
      console.error('Error al obtener la clave:', error);
      message.error('Error al obtener la clave');
    }
    setModalVisible(true);
  };

  const openEditModal = async () => {
    if (!selectedStoreId) {
      return message.warning("Seleccione una tienda para editar.");
    }

    try {
      const tienda = await fetchStoreById(selectedStoreId);
      if (!tienda) {
        return message.error("Tienda no encontrada");
      }

      setEditMode(true);
      form.setFieldsValue({
        clave: tienda.clave,
        nombre: tienda.nombre,
        direccion: tienda.direccion || "",
        telefono: tienda.telefono || "",
      });
      setModalVisible(true);
    } catch (error) {
      console.error("Error al cargar datos de tienda:", error);
      message.error("No se pudo cargar la tienda");
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editMode) {
        await updateStore(selectedStoreId, values);
        message.success("Tienda actualizada");
      } else {
        await onCreate(values);
        message.success("Tienda creada con éxito");
      }
      setModalVisible(false);
      form.resetFields();
      if (onReload) onReload();
    } catch (error) {
      console.error(error);
      message.error(editMode ? "Error al actualizar tienda" : "Error al crear tienda");
    }
  };

  const handleDelete = () => {
    if (!selectedStoreId) {
      return message.warning("Seleccione una tienda para eliminar.");
    }
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteStore(selectedStoreId);
      message.success("Tienda eliminada");
      setDeleteConfirmVisible(false);
      if (onReload) onReload();
    } catch {
      message.error("Error al eliminar tienda");
    }
  };

  return (
    <div style={{ padding: "0 16px" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button icon={<HomeOutlined />} block onClick={() => navigate("/home")}>
          Inicio
        </Button>

        <Divider style={{ margin: "8px 0" }} />

        <Title level={5} style={{ marginBottom: 0 }}>
          Tiendas
        </Title>

        <Tree
          showIcon
          defaultExpandAll
          selectedKeys={[selectedKey]}
          onSelect={onSelect}
          treeData={treeData}
          style={{ marginBottom: 8 }}
        />

        <Space style={{ justifyContent: "center", width: "100%" }}>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={openCreateModal}
            title="Crear tienda"
          />
          <Button
            icon={<EditOutlined />}
            onClick={openEditModal}
            title="Editar tienda"
            disabled={!isStoreKeySelected}
          />
          {canDelete &&
          (<Button
            icon={<DeleteOutlined />}
            danger
            onClick={handleDelete}
            title="Eliminar tienda"
            disabled={!isStoreKeySelected}
          />)}
        </Space>
      </Space>

      <Modal
        open={modalVisible}
        title={editMode ? "Editar tienda" : "Crear nueva tienda"}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={editMode ? "Guardar" : "Crear"}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="clave" label="Clave"
            rules={[
              { required: true, message: 'La clave es obligatoria' },
              { validator: validateClave }
            ]}
          >
            <Input disabled={editMode} />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={deleteConfirmVisible}
        title="Eliminar tienda"
        onCancel={() => setDeleteConfirmVisible(false)}
        onOk={confirmDelete}
        okType="danger"
        okText="Eliminar"
      >
        ¿Estás seguro de que deseas eliminar esta tienda?
      </Modal>
    </div>
  );
};

export default SidebarMenu;
