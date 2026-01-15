import React, { useState } from "react";
import { Form, Input, Button, message, Typography, Modal, Select, Progress } from "antd";
import { DownloadOutlined, LockOutlined, HomeOutlined, FolderOpenOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { Title } = Typography;

const BackupButton = () => {
  const [form] = Form.useForm();
  const [downloading, setDownloading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const mapMode = { full: "full", data: "data-only", schema: "schema-only" };

  const rebuildFileName = (mode, password, currentPath) => {
    if (!currentPath) return "";
    const parts = currentPath.split(/[/\\]/);
    const folder = parts.slice(0, -1).join("/") || "";
    let baseName = parts[parts.length - 1]
      .replace(/\.(backup|backup\.enc)$/i, "")
      .replace(/_(full|data|schema)$/i, "");
    if (mode) baseName += `_${mode}`;
    baseName += password ? ".backup.enc" : ".backup";
    return folder ? `${folder}/${baseName}` : baseName;
  };

  const handleSelectPath = async () => {
    try {
      const values = form.getFieldsValue();
      const selectedPath = await window.api.selectBackupPath(values.filename, values.password);
      if (selectedPath) form.setFieldsValue({ filename: selectedPath });
    } catch (err) {
      console.error("Error seleccionando ruta:", err);
      message.error("No se pudo seleccionar la ruta");
    }
  };

  const handleBackup = async () => {
    if (downloading) return;
    try {
      await form.validateFields();
      setConfirmVisible(true);
    } catch {
      message.error("Por favor completa los campos obligatorios");
    }
  };

  const executeBackup = async () => {
    const values = form.getFieldsValue();
    const filename = values.filename;
    const password = values.password || "";

    setDownloading(true);
    setProgress(0);

    try {
      const response = await apiClient.get("/api/respaldo/backup", {
        params: { filename, password, mode: mapMode[values.mode] },
        responseType: "arraybuffer",
      });

      await window.api.saveBackupFile(filename, response.data, (p) => {
        if (p && p.bytes) {
          setProgress(Math.min(Math.round((p.bytes / 1024) * 100), 100));
        }
      });

      message.success("Respaldo guardado correctamente.");
      form.resetFields();
    } catch (err) {
      console.error(err);
      message.error("Error generando el respaldo");
    } finally {
      setDownloading(false);
      setConfirmVisible(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", border: "1px solid #d9d9d9", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
      <div style={{ flex: 1, backgroundColor: "#f9f9f9", padding: 24 }}>
        <Button icon={<HomeOutlined />} onClick={() => navigate("/home")} style={{ marginBottom: 16 }}>Inicio</Button>
        <Title level={4}>Generación de respaldo</Title>

        <Form form={form} layout="vertical">
          <Form.Item
            name="filename"
            label="Destino del archivo"
            rules={[{ required: true, message: "Selecciona una ruta de destino" }]}
          >
            <Input
              readOnly
              placeholder="Selecciona destino..."
              addonAfter={<Button icon={<FolderOpenOutlined />} onClick={handleSelectPath} />}
            />
          </Form.Item>

          <Form.Item name="mode" label="Tipo de respaldo" initialValue="full">
            <Select
              onChange={(mode) => {
                const values = form.getFieldsValue();
                form.setFieldsValue({ filename: rebuildFileName(mode, values.password, values.filename) });
              }}
            >
              <Select.Option value="full">Completo (estructura + datos)</Select.Option>
              <Select.Option value="data">Solo datos</Select.Option>
              <Select.Option value="schema">Solo estructura</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="password" label="Proteger con contraseña (opcional)">
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña del respaldo"
              onChange={(e) => {
                const values = form.getFieldsValue();
                form.setFieldsValue({ filename: rebuildFileName(values.mode, e.target.value, values.filename) });
              }}
            />
          </Form.Item>

          {downloading && <Progress percent={progress} status="active" style={{ marginBottom: 16 }} />}

          <Form.Item style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleBackup}
              loading={downloading}
              disabled={downloading}
            >
              Generar Respaldo
            </Button>
          </Form.Item>

          <Modal
            open={confirmVisible}
            title="¿Deseas generar un respaldo?"
            okText="Generar"
            cancelText="Cancelar"
            onCancel={() => !downloading && setConfirmVisible(false)}
            onOk={executeBackup}
            confirmLoading={downloading}
            maskClosable={false}
            closable={!downloading}
          >
            Esto creará un archivo de respaldo de la base de datos.
          </Modal>
        </Form>
      </div>
    </div>
  );
};

export default BackupButton;