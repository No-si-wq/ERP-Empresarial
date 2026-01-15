import React, { useMemo } from "react";
import { Table, Card, Typography, Button, message, Popconfirm } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

const { Text } = Typography;

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  }).format(value ?? 0);

/**
 * Panel de resumen de pago mejorado con desglose de base, impuestos y total
 *
 * @param {Object} props
 * @param {Array} metodosPago - Métodos disponibles [{ key, descripcion }]
 * @param {number} subtotal - Suma sin impuestos (costBase o priceBase * cantidad)
 * @param {number} impuestos - Suma de impuestos aplicados
 * @param {number} total - Suma final con impuestos
 * @param {Array} pagosRecibidos - [{ metodo, importe, abreviatura, importeOriginal }]
 * @param {Function} onAgregarPago
 * @param {Function} onEliminarPago
 * @param {Function} onConfirmarPago
 * @param {Function} onCancelar
 * @param {"venta"|"compra"} modo - Contexto de la operación
 */
const PanelResumenPago = ({
  metodosPago = [],
  subtotal = 0,
  impuestos = 0,
  total = 0,
  pagosRecibidos = [],
  onAgregarPago,
  onEliminarPago,
  onConfirmarPago,
  onCancelar,
  modo = "venta",
}) => {
  const { totalRecibido, cambio } = useMemo(() => {
    const recibido = pagosRecibidos.reduce((acc, p) => acc + (p.importe ?? 0), 0);
    return {
      totalRecibido: recibido,
      cambio: +(recibido - total).toFixed(2),
    };
  }, [pagosRecibidos, total]);

  const columnsFormasPago = [
    { title: "Descripción", dataIndex: "descripcion", key: "descripcion" },
  ];

  const handleAgregarPago = (record) => {
    if (totalRecibido >= total) {
      message.warning("Ya se ha recibido el monto total");
      return;
    }
    onAgregarPago?.(record);
  };

  return (
    <div style={{ minWidth: 340, maxWidth: 350 }}>
      <Table
        columns={columnsFormasPago}
        dataSource={metodosPago}
        pagination={false}
        size="small"
        bordered
        style={{ marginBottom: 8 }}
        rowKey="key"
        onRow={(record) => ({
          onClick: () => handleAgregarPago(record),
        })}
      />

      
      <Card
        type="inner"
        title={`Resumen ${modo === "venta" ? "de Venta" : "de Compra"}`}
        style={{ marginBottom: 8 }}
        bodyStyle={{ padding: 16 }}
      >
        <ResumenItem
          label={modo === "venta" ? "Subtotal Precio Base" : "Subtotal Costo Base"}
          value={subtotal}
        />
        <ResumenItem label="Impuestos" value={impuestos} />
        <ResumenItem label="Total" value={total} bold />
        <ResumenItem label="Recibido" value={totalRecibido} />
        <ResumenItem
          label="Cambio"
          value={cambio}
          bold={cambio > 0}
          color={cambio > 0 ? "green" : undefined}
        />
      </Card>

      <Card
        type="inner"
        title="Pagos Registrados"
        style={{ marginBottom: 8 }}
        bodyStyle={{ padding: 8 }}
      >
        {pagosRecibidos.length === 0 ? (
          <Text type="secondary">Sin pagos registrados</Text>
        ) : (
          pagosRecibidos.map((p, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span>{p.metodo}</span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {p.abreviatura}
                </Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{formatCurrency(p.importeOriginal ?? p.importe)}</span>
                {onEliminarPago && (
                  <Popconfirm
                    title="¿Eliminar este pago?"
                    okText="Sí"
                    cancelText="No"
                    onConfirm={() => onEliminarPago(p, idx)}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      danger
                    />
                  </Popconfirm>
                )}
              </div>
            </div>
          ))
        )}
        {pagosRecibidos.length > 0 && (
          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              marginTop: 8,
              paddingTop: 4,
              textAlign: "right",
              fontWeight: "bold",
            }}
          >
            Total pagado: {formatCurrency(totalRecibido)}
          </div>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
        <Button onClick={onCancelar}>Cancelar</Button>
        <Button
          type="primary"
          disabled={totalRecibido < total}
          onClick={onConfirmarPago}
        >
          Confirmar
        </Button>
      </div>
    </div>
  );
};

const ResumenItem = ({ label, value, bold = false, color }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontWeight: bold ? "bold" : "normal",
      color: color || "inherit",
    }}
  >
    <span>{label}</span>
    <span>{formatCurrency(value)}</span>
  </div>
);

export default PanelResumenPago;
