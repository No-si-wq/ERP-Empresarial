import React from "react";
import { Modal, Form, Input } from "antd";

const ProveedorForm = ({
  visible,
  onCreate,
  onCancel,
  confirmLoading = false,
  initialValues = {}
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue(initialValues);
    }
  }, [visible, initialValues, form]);

  return (
    <Modal
      open={visible}
      title="Nuevo Proveedor"
      okText="Agregar"
      cancelText="Cancelar"
      confirmLoading={confirmLoading}
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            onCreate(values);
          })
          .catch(() => {});
      }}
      destroyOnClose
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onCreate}
        initialValues={initialValues}
      >
        <Form.Item name="name" label="Nombre" rules={[{ required: true, message: "Nombre requerido" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="rtn" label="RTN" rules={[{ required: true, message: "RTN requerido" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="email" label="Correo">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="Teléfono" rules={[{ required: true, message: "Teléfono requerido" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Dirección" rules={[{ required: true, message: "Dirección requerida" }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProveedorForm;