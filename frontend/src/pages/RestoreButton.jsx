import React, { useState } from "react";
import {
  Button,
  message,
  Input,
  Form,
  Modal,
  Typography,
  Progress,
  Card,
} from "antd";
import {
  UploadOutlined,
  LockOutlined,
  ReloadOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const { Title } = Typography;

const RestoreButton = () => {
  const [file, setFile] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileSelect = async () => {
    try {
      const filePath = await window.api.selectRestoreFile();

      if (!filePath) return;

      setFile({
        path: filePath,
        name: filePath.split(/[\\/]/).pop(),
      });

      message.success(`Archivo seleccionado: ${filePath.split(/[\\/]/).pop()}`);
    } catch (err) {
      console.error(err);
      message.error("Error al seleccionar archivo");
    }
  };

  const handleRestore = async () => {
    if (!file) {
      message.warning("Selecciona un archivo de respaldo primero.");
      return;
    }

    const { password } = await form.validateFields();

    try {
      setLoading(true);
      setProgress(0);

      const verifyRes = await apiClient.post("/api/respaldo/restore", {
        filePath: file.path,
        password: password || "",
        verifyOnly: true,
      });

      if (!verifyRes.data.valid) {
        message.error("Contraseña incorrecta o archivo inválido.");
        setLoading(false);
        return;
      }

      Modal.confirm({
        title: "¿Restaurar respaldo?",
        content: "Esto sobrescribirá toda la base de datos actual.",
        okText: "Restaurar",
        cancelText: "Cancelar",
        async onOk() {
          try {
            setLoading(true);
            setProgress(0);
            await apiClient.post("/api/respaldo/restore", {
              filePath: file.path,
              password: password || "",
              verifyOnly: false,
            });
            message.success("Restauración completada correctamente");
            setFile(null);
            form.resetFields();
            setProgress(100);
          } catch (err) {
            console.error(err);
            message.error("Error durante la restauración.");
          } finally {
            setLoading(false);
          }
        },
      });
    } catch (err) {
      console.error(err);
      message.error("Error al verificar el respaldo.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 16,
      }}
    >
      <Card
        style={{
          padding: 24,
          borderRadius: 12,
          boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
            Inicio
          </Button>
        </div>

        <Title level={4} style={{ marginBottom: 16, textAlign: "center" }}>
          Restauración de Respaldo
        </Title>

        <Form form={form} layout="vertical">

          <Form.Item label="Archivo de respaldo (.backup / .backup.enc)" required>
            <Button icon={<UploadOutlined />} onClick={handleFileSelect}>
              Seleccionar respaldo
            </Button>

            {file && (
              <div style={{ marginTop: 8, fontStyle: "italic" }}>
                Archivo seleccionado: <strong>{file.name}</strong>
              </div>
            )}
          </Form.Item>

          <Form.Item name="password" label="Contraseña (si aplica)">
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Contraseña del respaldo"
            />
          </Form.Item>

          {loading && (
            <div style={{ marginBottom: 20 }}>
              <Progress percent={progress} strokeWidth={12} />
            </div>
          )}

          <Form.Item style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRestore}
              disabled={!file}
              loading={loading}
            >
              Restaurar Respaldo
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default RestoreButton;