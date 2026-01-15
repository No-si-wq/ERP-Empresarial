import React, { useEffect, useState, useContext } from 'react';
import { 
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  message,
  Tabs 
} from 'antd';
import { 
  PlusOutlined,
  DeleteOutlined,
  HomeOutlined,
  EditOutlined,
  ReloadOutlined 
} from "@ant-design/icons";
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../hooks/AuthProvider";
import apiClient from '../api/axios';

const { TabPane } = Tabs;

export default function CurrencyPage() {
  const { auth } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [current, setCurrent] = useState(null);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const fetchData = async (p = 1) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/currencies?page=${p}&limit=10`);
      const { data, total } = response.data; 
      setData(data);
      setTotal(total);
    } catch (error) {
      message.error("Error al cargar las monedas", error);
    } finally {
      setLoading(false);
    }
  };

  const validateClave = async (_, value) => {
    if (!value || editMode) return Promise.resolve();

    try {
      const response = await apiClient.get(`/api/currencies/check-clave/${value}`);
      const { exists } = response.data;
      if (exists) {
        Modal.error({
          title: 'Clave duplicada',
          content: `La clave "${value}" ya está registrada.`,
          okText: 'Aceptar'
        });
        return Promise.reject(new Error('La clave ya existe'));
      }
      return Promise.resolve();
    } catch {
      Modal.error({
        title: 'Error de validación',
        content: 'No se pudo verificar la clave en este momento.',
        okText: 'Aceptar'
      });
      return Promise.reject(new Error('Error al validar clave'));
    }
  };

  const handleAdd = async (values) => {
    try {
      await apiClient.post('/api/currencies', values);
      await fetchData(); 
      message.success('Moneda agregada');
    } catch {
      message.error('Error al agregar moneda');
    }
  };

  const handleEdit = async (values) => {
    try {
      await apiClient.put(`/api/currencies/${current.id}`, values);
      fetchData(page);
      message.success('Moneda actualizada');
    } catch {
      message.error('Error al actualizar moneda');
    }
  };

  const onEdit = () => {
    if (!current) return message.warning('Selecciona un registro');
    setEditMode(true);
    form.setFieldsValue(current);
    setModalVisible(true);
  };

  const onDelete = async () => {
    if (!current) return message.warning('Selecciona un registro');
    try {
      await apiClient.delete(`/api/currencies/${current.id}`);
      message.success('Método de pago eliminado');
      fetchData(page);
      setCurrent(null);
    } catch {
      message.error('Error al eliminar');
    }
  };

  const columns = [
    { title: 'Clave', dataIndex: 'clave', key: 'clave' },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion' },
    { title: 'Abreviatura', dataIndex: 'abreviatura', key: 'abreviatura' },
    { title: 'Tipo de cambio', dataIndex: 'tipoCambio', key: 'tipoCambio' },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha' },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Tabs defaultActiveKey="1" style={{ marginBottom: 20 }}>
        <TabPane tab="Archivo" key="1" />
        <TabPane tab="Catálogos" key="2" />
        <TabPane tab="Configuración" key="3" />
      </Tabs>

      <div style={{ marginBottom: 16 }}>
        <Button icon={<HomeOutlined />} onClick={() => navigate('/home')} style={{ marginRight: 8 }}>Inicio</Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={async () => {
            setEditMode(false);
            setCurrent(null);
            form.resetFields();
            try {
              const response = await apiClient.get('/api/currencies/next-clave');
              const { clave } = response.data;
              form.setFieldsValue({ clave });
              setModalVisible(true);
            } catch {
              message.error('Error al obtener la clave');
            }
          }}
          style={{ marginRight: 8 }}
        >
          Añadir
        </Button>
        <Button icon={<EditOutlined />} onClick={onEdit} style={{ marginRight: 8 }} disabled={!current}>Editar</Button>
        <Popconfirm title="¿Seguro que deseas eliminar?" onConfirm={onDelete}>
          {canDelete && 
          (<Button icon={<DeleteOutlined />} danger style={{ marginRight: 8 }} disabled={!current}>
            Eliminar
          </Button>)}
        </Popconfirm>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData(page)}>Actualizar</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: setPage,
        }}
        onRow={(record) => ({
          onClick: () => { setCurrent((prev) => (prev?.id === record.id ? null : record)); },
        })}
        rowClassName={(record) =>
          current?.id === record.id ? 'ant-table-row-selected' : ''
        }
      />

      <Modal
        title={editMode ? "Editar moneda" : "Agregar moneda"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          onFinish={async (values) => {
            try {
              if (editMode) {
                await handleEdit(values);
              } else {
                await handleAdd(values);
              }
              setModalVisible(false);
              form.resetFields();
            } catch {
              message.error("Error al guardar los cambios");
            }
          }}
        >
          <Form.Item name="clave" label="Clave" 
            rules={[
              { required: true, message: 'La clave es obligatoria' },
              { validator: validateClave }
            ]}
          >
            <Input disabled={editMode} />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="abreviatura" label="Abreviatura" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tipoCambio" label="Tipo de cambio" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {editMode ? "Actualizar" : "Guardar"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
}
