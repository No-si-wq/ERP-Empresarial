import React, { useState, useEffect, useContext } from "react";
import {
  Table, 
  Tabs, 
  Space, 
  Button, 
  Input, 
  message,
  Modal, 
  Form, 
  Select, 
  InputNumber
} from "antd";
import {
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined, 
  FileExcelOutlined, 
  SearchOutlined, 
  AppstoreOutlined
} from "@ant-design/icons";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { useInventario } from "../hooks/useInventario";
import apiClient from "../api/axios";
import { AuthContext } from "../hooks/AuthProvider";

const { TabPane } = Tabs;

const InventarioView = ({ storeId }) => {
  const {
    productos, 
    categorias = [], 
    taxOptions = [], 
    loading, 
    fetchProductos
  } = useInventario(storeId);

  const { auth } = useContext(AuthContext);
  const [busqueda, setBusqueda] = useState("");
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [precioFinal, setPrecioFinal] = useState(0);
  const [costoFinal, setCostoFinal] = useState(0);
  const canDelete = auth.permissions.includes("PERMISSION_DELETE_ROLE");
  const [form] = Form.useForm();

  useEffect(() => {
    const term = busqueda.trim().toLowerCase();
    setProductosFiltrados(
      term
        ? productos.filter(p => [p.name, p.sku].some(s => s?.toLowerCase().includes(term)))
        : productos
    );
  }, [busqueda, productos]);

  useEffect(() => {
    if (editMode && selectedProducto) {
      form.setFieldsValue({
        name: selectedProducto.name,
        sku: selectedProducto.sku,
        quantity: selectedProducto.quantity,
        priceBase: selectedProducto.priceBase || 0,
        costBase: selectedProducto.costBase || 0,
        taxId: selectedProducto.tax?.id || null,
        categoryId: selectedProducto.category?.id || null,
      });

      setPrecioFinal(selectedProducto.priceFinal || 0);
      setCostoFinal(selectedProducto.costFinal || 0);
    } else {
      form.resetFields();
      setPrecioFinal(0);
      setCostoFinal(0);
    }
  }, [editMode, selectedProducto, form]);

  const exportToExcel = () => {
    const rows = productosFiltrados.map(p => ({
      Nombre: p.name,
      SKU: p.sku,
      Cantidad: p.quantity,
      "Costo (sin impuesto)": (p.costBase ?? 0).toFixed(2),
      "Costo (con impuesto)": (p.costFinal ?? 0).toFixed(2),
      "Precio (sin impuesto)": (p.priceBase ?? 0).toFixed(2),
      "Precio (con impuesto)": (p.priceFinal ?? 0).toFixed(2),
      Impuesto: p.tax?.percent ? `${(p.tax.percent * 100).toFixed(2)}%` : "0%",
      Categoría: p.category?.name || "Sin categoría"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), "Inventario.xlsx");
  };

  const openAddModal = () => {
    setEditMode(false);
    setSelectedProducto(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = () => {
    if (!selectedProducto) return;
    setEditMode(true);
    setModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedProducto) return;

    Modal.confirm({
      title: "Eliminar producto",
      content: `¿Desea eliminar "${selectedProducto.name}"?`,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await apiClient.delete(`/api/inventario/${selectedProducto.id}`);
          message.success("Producto eliminado");
          setSelectedProducto(null);
          fetchProductos();
        } catch (error) {
          console.error("Error al eliminar producto:", error);
          message.error("Error al eliminar producto");
        }
      }
    });
  };

  const recalcTotals = () => {
    const values = form.getFieldsValue();
    const impuesto = taxOptions.find(t => t.value === values.taxId);
    const percent = impuesto?.percent || 0;

    const newPriceFinal = (values.priceBase || 0) * (1 + percent);
    const newCostFinal = (values.costBase || 0) * (1 + percent);

    setPrecioFinal(newPriceFinal.toFixed(2));
    setCostoFinal(newCostFinal.toFixed(2));
  };

  const onFinish = async (values) => {
    const impuesto = taxOptions.find(t => t.value === values.taxId);
    const percent = impuesto?.percent || 0;

    const priceFinal = values.priceBase * (1 + percent);
    const costFinal = values.costBase * (1 + percent);

    const basePayload = {
      name: values.name,
      sku: values.sku,
      priceBase: values.priceBase,
      priceFinal,
      costBase: values.costBase,
      costFinal,
      taxId: values.taxId,
      categoryId: values.categoryId || null,
      storeId,
    };

    const payload = editMode
      ? basePayload
      : { ...basePayload, quantity: 0 };

    try {
      let response;
      if (editMode) {
        response = await apiClient.put(`/api/inventario/${selectedProducto.id}`, payload);
      } else {
        response = await apiClient.post(`/api/inventario/tienda/${storeId}`, payload);
      }

      message.success(editMode ? "Producto actualizado" : "Producto creado");
      setModalVisible(false);
      form.resetFields();
      setSelectedProducto(null);
      await fetchProductos();

      if (editMode) setSelectedProducto(response.data);
    } catch (error) {
      console.error("Error al guardar producto:", error.response?.data || error.message);
      message.error(error.response?.data?.error || "Error al guardar el producto");
    }
  };

  const columns = [
    { title: "Nombre", dataIndex: "name", key: "name" },
    { title: "Código", dataIndex: "sku", key: "sku" },
    { title: "Costo (sin impuesto)", dataIndex: "costBase", key: "costBase", render: v => `L. ${(v ?? 0).toFixed(2)}` },
    { title: "Costo (con impuesto)", dataIndex: "costFinal", key: "costFinal", render: v => `L. ${(v ?? 0).toFixed(2)}` },
    { title: "Precio (sin impuesto)", dataIndex: "priceBase", key: "priceBase", render: v => `L. ${(v ?? 0).toFixed(2)}` },
    { title: "Precio (con impuesto)", dataIndex: "priceFinal", key: "priceFinal", render: v => `L. ${(v ?? 0).toFixed(2)}` },
    { title: "Impuesto", dataIndex: "tax", key: "tax", render: (t) => t ? `${(t.percent * 100).toFixed(2)}%` : "Sin impuesto" },
    { title: "Categoría", key: "category", render: (_, r) => r.category?.name || "Sin categoría" }
  ];

  return (
    <div style={{ padding: 20 }}>
      <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 16 }}>
        <TabPane tab={<><AppstoreOutlined /> Archivo</>} key="1">
          <Space wrap>
            <Button 
              onClick={openAddModal} 
              icon={<PlusOutlined />} 
              disabled={!storeId} 
              title={!storeId ? "Selecciona una tienda primero" : ""}
            >
              Añadir
            </Button>
            <Button onClick={openEditModal} icon={<EditOutlined />} disabled={!selectedProducto}>
              Editar
            </Button>
            {canDelete && 
              (<Button onClick={handleDelete} icon={<DeleteOutlined />} disabled={!selectedProducto}>
                Eliminar
              </Button>)}
            <Button onClick={fetchProductos} icon={<ReloadOutlined />}>Actualizar</Button>
            <Button onClick={exportToExcel} icon={<FileExcelOutlined />}>Excel</Button>
            <Input
              placeholder="Buscar..."
              prefix={<SearchOutlined />}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              allowClear
              style={{ width: 300 }}
            />
          </Space>
        </TabPane>
      </Tabs>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={productosFiltrados}
        loading={loading}
        onRow={record => ({
          onClick: () => setSelectedProducto(record),
        })}
        rowClassName={record => (selectedProducto?.id === record.id ? "ant-table-row-selected" : "")}
        pagination={{ pageSize: 12 }}
      />

      <Modal
        open={modalVisible}
        title={editMode ? "Editar Producto" : "Agregar Producto"}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedProducto(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            onFinish({ ...values, quantity: 0 });
          }}
          onValuesChange={recalcTotals}
        ></Form>
        <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={recalcTotals}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sku" label="Código" rules={[{ required: true, message: "El SKU es obligatorio" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="costBase" label="Costo sin impuesto" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="priceBase" label="Precio sin impuesto" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="taxId" label="Impuesto">
            <Select placeholder="Seleccione un impuesto" allowClear options={taxOptions} />
          </Form.Item>
          <Form.Item label="Precio con impuesto">
            <Input value={`L. ${precioFinal}`} disabled />
          </Form.Item>
          <Form.Item label="Costo con impuesto">
            <Input value={`L. ${costoFinal}`} disabled />
          </Form.Item>
          <Form.Item name="categoryId" label="Categoría">
            <Select placeholder="Seleccione una categoría" allowClear>
              {categorias.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            {editMode ? "Actualizar" : "Guardar"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default InventarioView;
