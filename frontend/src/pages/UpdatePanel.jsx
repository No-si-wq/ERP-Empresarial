import React from "react";
import {
  Button,
  Progress,
  Tag,
  Tabs,
  Space,
  Typography,
  Alert,
} from "antd";
import {
  CloudDownloadOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useUpdater } from "../context/UpdateContext";
import { useNavigate } from "react-router-dom";

const { TabPane } = Tabs;
const { Text, Title } = Typography;

export default function UpdatePanel() {
  const { status, progress, version, check, download, install } = useUpdater();
  const navigate = useNavigate();

  const statusColor = {
    idle: "default",
    checking: "processing",
    available: "warning",
    downloading: "processing",
    downloaded: "success",
    none: "default",
    error: "error",
  }[status] || "default";

  const statusLabel = {
    idle: "Inactivo",
    checking: "Buscando actualizaciones",
    available: "Actualización disponible",
    downloading: "Descargando",
    downloaded: "Lista para instalar",
    none: "Sin actualizaciones",
    error: "Error",
  }[status] || status;

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
          maxWidth: 900,
          background: "#e7eaf6",
          borderRadius: 8,
          boxShadow: "0 2px 8px #dbeafe50",
          padding: 16,
        }}
      >
        <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 24 }}>
          <TabPane
            key="1"
            tab={
              <span>
                <CloudDownloadOutlined /> Actualizaciones
              </span>
            }
          >
            <Space style={{ marginBottom: 16 }}>
              <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
                Inicio
              </Button>

              <Button
                icon={<ReloadOutlined />}
                onClick={check}
                loading={status === "checking"}
              >
                Buscar actualización
              </Button>

              {status === "available" && (
                <Button
                  type="primary"
                  icon={<CloudDownloadOutlined />}
                  onClick={download}
                >
                  Descargar v{version}
                </Button>
              )}

              {status === "downloaded" && (
                <Button type="primary" danger onClick={install}>
                  Reiniciar y actualizar
                </Button>
              )}
            </Space>

            <div
              style={{
                background: "white",
                borderRadius: 6,
                padding: 20,
              }}
            >
              <Title level={5}>Estado del sistema</Title>

              <Space direction="vertical" style={{ width: "100%" }} size="middle">
                <div>
                  <Text strong>Estado actual:</Text>{" "}
                  <Tag color={statusColor}>{statusLabel}</Tag>
                </div>

                {status === "downloading" && (
                  <>
                    <Text>Descargando actualización…</Text>
                    <Progress percent={progress} />
                  </>
                )}

                {status === "available" && (
                  <Alert
                    type="info"
                    showIcon
                    message={`Nueva versión disponible (${version})`}
                    description="Puedes descargarla ahora o hacerlo más tarde."
                  />
                )}

                {status === "downloaded" && (
                  <Alert
                    type="success"
                    showIcon
                    message="Actualización lista"
                    description="Reinicia la aplicación para completar la instalación."
                  />
                )}

                {status === "none" && (
                  <Alert
                    type="success"
                    showIcon
                    message="Sistema actualizado"
                    description="No hay actualizaciones disponibles."
                  />
                )}

                {status === "error" && (
                  <Alert
                    type="error"
                    showIcon
                    message="Error al buscar actualizaciones"
                    description="Revisa tu conexión o intenta más tarde."
                  />
                )}

                <Text type="secondary">
                  <InfoCircleOutlined /> Las actualizaciones solo deben realizarse
                  cuando no haya operaciones activas.
                </Text>
              </Space>
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
}