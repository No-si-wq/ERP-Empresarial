import React from "react";
import { Form, Input, Modal } from "antd";

const ClienteForm = ({ visible, onCreate, onCancel, confirmLoading }) => {
  const [form] = Form.useForm();

  return (
    <Modal
      title="Nuevo Cliente"
      open={visible}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={() => form.submit()}
      confirmLoading={confirmLoading}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onCreate}
      >
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
        <Form.Item name="creditLimit" label="Límite de Crédito">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="creditBalance" label="Saldo de Crédito">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="creditDays" label="Días de Crédito">
          <Input type="number" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ClienteForm;