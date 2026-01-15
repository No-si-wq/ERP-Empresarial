import React, { useEffect, useState, useContext } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tabs,
  Space,
  Select,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { AuthContext } from "../hooks/AuthProvider";
import { useCajas } from "../hooks/useCajas";

const { TabPane } = Tabs;

const CajasView = ({ storeId }) => {
  const {
    cajas,
    stores,
    loading,
    fetchCajas,
    createCaja,
    updateCaja,
    deleteCaja,
    validateClave,
    getNextClave,
  } = useCajas(storeId);

  const [selectedCaja, setSelectedCaja] = useState(null);
  const { auth } = useContext(AuthContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();

  const [busqueda, setBusqueda] = useState("");
  const [cajasFiltradas, setCajasFiltradas] = useState([]);

  useEffect(() => {
    const term = busqueda.toLowerCase().trim();
    setCajasFiltradas(
      term
        ? cajas.filter((caja) =>
            [caja.descripcion, caja.numeroDeCaja?.toString(), caja.formatoNota, caja.formatoCFDI]
              .filter(Boolean)
              .some((val) => val.toLowerCase().includes(term))
          )
        : cajas
    );
  }, [busqueda, cajas]);

  const exportToExcel = () => {
    const data = cajasFiltradas.map((caja) => ({
      ID: caja.id,
      "Número de Caja": caja.numeroDeCaja,
      Descripción: caja.descripcion,
      "Formato Nota": caja.formatoNota,
      "Formato CFDI": caja.formatoCFDI,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cajas");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer]), "Cajas.xlsx");
  };

  const openAddModal = async () => {
    setEditMode(false);
    setSelectedCaja(null);
    form.resetFields();

    const clave = await getNextClave();
    if (clave) {
      form.setFieldsValue({ numeroDeCaja: clave });
    }
    form.setFieldsValue({ storeId });

    setModalVisible(true);
  };

  const openEditModal = () => {
    if (!selectedCaja) return;

    setEditMode(true);
    form.setFieldsValue({
      numeroDeCaja: selectedCaja.numeroDeCaja,
      descripcion: selectedCaja.descripcion,
      formatoNota: selectedCaja.formatoNota,
      formatoCFDI: selectedCaja.formatoCFDI,
      storeId: selectedCaja.storeId,
    });
    setModalVisible(true);
  };

  const onFinish = async (values) => {
    const payload = {
      ...values,
      numeroDeCaja: Number(values.numeroDeCaja),
      storeId,
    };

    if (editMode) {
      await updateCaja(selectedCaja.id, payload);
    } else {
      await createCaja(payload);
    }

    setModalVisible(false);
    form.resetFields();
    setSelectedCaja(null);
  };

  const handleDelete = async () => {
    if (!selectedCaja) return;

    Modal.confirm({
      title: "¿Eliminar caja?",
      content: `¿Deseas eliminar la caja número ${selectedCaja.numeroDeCaja}?`,
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okType: "danger",
      onOk: async () => {
        await deleteCaja(selectedCaja.id);
        setSelectedCaja(null);
      },
    });
  };

  const columns = [
    { title: "Número de Caja", dataIndex: "numeroDeCaja" },
    { title: "Descripción", dataIndex: "descripcion" },
    { title: "Formato Nota", dataIndex: "formatoNota" },
    { title: "Formato CFDI", dataIndex: "formatoCFDI" },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Archivo" key="1" />
        <TabPane tab="Catálogos" key="2" />
        <TabPane tab="Configuración" key="3" />
      </Tabs>

      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
          Añadir
        </Button>
        <Button icon={<EditOutlined />} disabled={!selectedCaja} onClick={openEditModal}>
          Editar
        </Button>
        <Popconfirm
          title="¿Seguro que deseas eliminar esta caja?"
          onConfirm={handleDelete}
          okText="Sí"
          cancelText="No"
        >
          {canDelete && 
          (<Button icon={<DeleteOutlined />} danger disabled={!selectedCaja}>
            Eliminar
          </Button>)}
        </Popconfirm>
        <Button icon={<ReloadOutlined />} onClick={() => fetchCajas()}>
          Actualizar
        </Button>
        <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>
          Exportar
        </Button>
        <Input
          placeholder="Buscar..."
          prefix={<SearchOutlined />}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          allowClear
          style={{ width: 250 }}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={cajasFiltradas}
        loading={loading}
        onRow={(record) => ({
          onClick: () => setSelectedCaja(record),
        })}
        rowClassName={(record) =>
          selectedCaja?.id === record.id ? "ant-table-row-selected" : ""
        }
        pagination={{ pageSize: 10 }}
      />

      <Modal
        open={modalVisible}
        title={editMode ? "Editar Caja" : "Agregar Caja"}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="numeroDeCaja"
            label="Número de Caja"
            rules={[
              { required: true, message: "El número de caja es obligatorio" },
              { validator: (_, value) => validateClave(_, value, editMode) },
            ]}
          >
            <Input type="number" disabled={editMode} />
          </Form.Item>

          <Form.Item name="descripcion" label="Descripción" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="formatoNota" label="Formato Nota" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="formatoCFDI" label="Formato CFDI" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            {editMode ? "Actualizar" : "Guardar"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default CajasView;