import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  TimePicker,
  Select,
  Radio,
  Input,
  message,
  Tabs,
  Space,
  Tooltip,
  Typography,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  HomeOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import apiClient from "../api/axios";
import { useNavigate } from "react-router-dom";

dayjs.extend(duration);

const { Option } = Select;
const { TabPane } = Tabs;
const { Text } = Typography;

const ScheduledBackups = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [cronPreview, setCronPreview] = useState("");
  const [cronReadable, setCronReadable] = useState("");
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/respaldo/scheduled-backups");
      setJobs(res.data);
    } catch {
      message.error("No se pudieron cargar los jobs programados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setJobs((prev) => [...prev]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getCountdownHybrid = (record) => {
    if (record.countdown != null) {
      const diffMs = record.countdown;
      if (diffMs <= 0) return "Ahora";
      const d = dayjs.duration(diffMs);
      return `${d.hours()}h ${d.minutes()}m ${d.seconds()}s`;
    }

    if (!record.nextRun) return "N/A";
    const diffMs = dayjs(record.nextRun).diff(dayjs());
    if (diffMs <= 0) return "Ahora";
    const d = dayjs.duration(diffMs);
    return `${d.hours()}h ${d.minutes()}m ${d.seconds()}s`;
  };

  const getFrequencyFromCron = (cron) => {
    const parts = cron.split(" ");
    if (parts[2] === "*" && parts[4] === "0") return "weekly";
    if (parts[2] === "1") return "monthly";
    return "daily";
  };

  const generateCron = (time, frequency) => {
    if (!time || !time.isValid() || !frequency) return null;
    const hour = time.hour();
    const minute = time.minute();

    switch (frequency) {
      case "daily":
        return `${minute} ${hour} * * *`;
      case "weekly":
        return `${minute} ${hour} * * 0`;
      case "monthly":
        return `${minute} ${hour} 1 * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  };

  const cronToReadable = (cron) => {
    const [minute, hour, day, month, week] = cron.split(" ");
    const h = hour.padStart(2, "0");
    const m = minute.padStart(2, "0");

    if (day === "*" && week === "*") return `Todos los días a las ${h}:${m}`;
    if (day === "*" && week === "0") return `Todos los domingos a las ${h}:${m}`;
    if (day === "1") return `El día 1 de cada mes a las ${h}:${m}`;

    return cron;
  };

  const updateCronPreview = () => {
    const { time, frequency } = form.getFieldsValue();
    if (!time || !frequency) {
      setCronPreview("");
      setCronReadable("");
      return;
    }

    const cron = generateCron(time, frequency);
    setCronPreview(cron || "");
    setCronReadable(cron ? cronToReadable(cron) : "");
  };

  const openCreateModal = () => {
    setEditingJob(null);
    setSelectedJob(null);
    setModalVisible(true);
    form.resetFields();
    setCronPreview("");
    setCronReadable("");
  };

  const openEditModal = () => {
    if (!selectedJob) return;

    const [minute, hour] = selectedJob.schedule.split(" ");
    const time = dayjs(`${hour}:${minute}`, "HH:mm");
    const frequency = getFrequencyFromCron(selectedJob.schedule);

    setEditingJob(selectedJob);

    form.setFieldsValue({
      time,
      frequency,
      options: selectedJob.mode,
      password: "",
    });

    setTimeout(updateCronPreview, 0);
    setModalVisible(true);
  };

  const handleSaveJob = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();

      const cronExpression = generateCron(values.time, values.frequency);
      if (!cronExpression) return message.error("Hora o frecuencia inválida");

      if (editingJob) {
        await apiClient.post("/api/respaldo/scheduled-backups/cancel", {
          jobId: editingJob.jobId,
        });
      }

      await apiClient.post("/api/respaldo/schedule-backup", {
        schedule: cronExpression,
        password: values.password || "",
        options: values.options,
      });

      message.success(editingJob ? "Job reprogramado" : "Job creado");
      setModalVisible(false);
      form.resetFields();
      setEditingJob(null);
      setSelectedJob(null);
      setCronPreview("");
      setCronReadable("");

      fetchJobs();
    } catch (err) {
      console.error(err);
      message.error("Error al guardar el job");
    }
  };

  const cancelJob = async () => {
    if (!selectedJob) return;

    try {
      await apiClient.post("/api/respaldo/scheduled-backups/cancel", {
        jobId: selectedJob.jobId,
      });
      message.success("Job cancelado correctamente");
      fetchJobs();
    } catch {
      message.error("No se pudo cancelar el job");
    }
  };

  const columns = [
    {
      title: "Expresión CRON",
      dataIndex: "schedule",
      key: "schedule",
    },
    {
      title: "Tipo de respaldo",
      dataIndex: "mode",
      key: "mode",
    },
    {
      title: "Activo",
      dataIndex: "activo",
      key: "activo",
      render: (activo) => (
        <span style={{ color: activo ? "green" : "red", fontWeight: "bold" }}>
          {activo ? "Sí" : "No"}
        </span>
      ),
    },
    {
      title: "Próxima ejecución",
      dataIndex: "nextRun",
      key: "nextRun",
      render: (nextRun) =>
        nextRun ? dayjs(nextRun).format("DD/MM/YYYY HH:mm:ss") : "N/A",
    },
    {
      title: "Cuenta regresiva",
      key: "countdown",
      render: (_, record) => {
        const text = getCountdownHybrid(record);

        let color = "green";

        const diffMs = record.countdown ?? dayjs(record.nextRun).diff(dayjs());

        if (diffMs < 60 * 1000) color = "red";
        else if (diffMs < 10 * 60 * 1000) color = "orange";

        return <span style={{ color, fontWeight: "bold" }}>{text}</span>;
      },
    },
  ];

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
          maxWidth: 1200,
          background: "#e7eaf6",
          borderRadius: 8,
          boxShadow: "0 2px 8px #dbeafe50",
          padding: 16,
        }}
      >
        <Tabs defaultActiveKey="1" type="card" style={{ marginBottom: 24 }}>
          <TabPane
            tab={
              <span>
                <HomeOutlined /> Archivo
              </span>
            }
            key="1"
          >
            <Space>
              <Button icon={<HomeOutlined />} onClick={() => navigate("/home")}>
                Inicio
              </Button>

              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                Añadir
              </Button>

              <Button
                icon={<EditOutlined />}
                disabled={!selectedJob}
                onClick={openEditModal}
              >
                Reprogramar
              </Button>

              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedJob}
                onClick={cancelJob}
              >
                Cancelar
              </Button>

              <Button icon={<ReloadOutlined />} onClick={fetchJobs}>
                Actualizar
              </Button>
            </Space>
          </TabPane>
        </Tabs>

        <Table
          columns={columns}
          dataSource={jobs}
          loading={loading}
          rowKey="jobId"
          pagination={{ pageSize: 10 }}
          onRow={(record) => ({
            onClick: () => setSelectedJob(record),
          })}
          rowClassName={(record) =>
            selectedJob?.jobId === record.jobId ? "ant-table-row-selected" : ""
          }
          style={{ background: "white", borderRadius: 4 }}
        />
      </div>

      <Modal
        title={editingJob ? "Reprogramar Job" : "Agregar Job"}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingJob(null);
          form.resetFields();
          setCronPreview("");
          setCronReadable("");
        }}
        onOk={handleSaveJob}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onValuesChange={updateCronPreview}>
          <Form.Item
            name="time"
            label="Hora del respaldo"
            rules={[{ required: true, message: "Selecciona la hora del respaldo" }]}
          >
            <TimePicker format="HH:mm" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="frequency"
            label="Frecuencia"
            rules={[{ required: true, message: "Selecciona la frecuencia" }]}
          >
            <Select placeholder="Selecciona frecuencia">
              <Option value="daily">Diaria</Option>
              <Option value="weekly">Semanal</Option>
              <Option value="monthly">Mensual</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="options"
            label="Tipo de respaldo"
            rules={[{ required: true, message: "Selecciona un tipo de respaldo" }]}
          >
            <Radio.Group style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Radio value="data-only">Solo datos</Radio>
              <Radio value="schema-only">Solo estructura</Radio>
              <Radio value="full">Ambos</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="password" label="Contraseña (opcional)">
            <Input.Password placeholder="Protege con contraseña" />
          </Form.Item>

          {cronPreview && (
            <Form.Item label="Previsualización CRON">
              <Tooltip title={cronReadable}>
                <Text code>{cronPreview}</Text>
              </Tooltip>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduledBackups;