import React, { useEffect, useState } from "react";
import { Modal, InputNumber, Button, Typography, Select } from "antd";

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Modal para ingresar el monto recibido con conversión de moneda
 *
 * @param {boolean} open
 * @param {Function} onCancel
 * @param {Function} onAceptar - (valorConvertido, monedaSeleccionada, metodoPago)
 * @param {number} valorIngreso
 * @param {Function} setValorIngreso
 * @param {Array} monedas - Lista de monedas con tipoCambio
 * @param {Object} metodoPago - Objeto del método de pago seleccionado (ej. { clave, descripcion })
 */

const ModalIngresoPago = ({
  open,
  onCancel,
  onAceptar,
  valorIngreso,
  setValorIngreso,
  monedas = [],
  metodoPago = null,
}) => {
  const [monedaSeleccionada, setMonedaSeleccionada] = useState(null);

  useEffect(() => {
    if (open) {
      setValorIngreso(0);
      setMonedaSeleccionada(null);
    }
  }, [open]);

  const handleAceptar = () => {
    const tipoCambio = monedaSeleccionada?.tipoCambio ?? 1;
    const valorConvertido = valorIngreso * tipoCambio;
    onAceptar({
      valorOriginal: valorIngreso,
      valorConvertido,
      moneda: monedaSeleccionada,
      metodo: metodoPago,
    });
  };

  return (
    <Modal open={open} footer={null} onCancel={onCancel} centered destroyOnClose>
      <div style={{ padding: 16 }}>
        <Title level={5}>Registrar Pago</Title>
        {metodoPago && (
          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            Método de pago seleccionado: <strong>{metodoPago.descripcion}</strong>
          </Text>
        )}
        <InputNumber
          style={{ width: "100%", marginBottom: 16 }}
          min={1}
          step={1}
          addonBefore="Monto"
          placeholder="Ingresa el monto"
          value={valorIngreso}
          onChange={(value) => setValorIngreso(Number(value))}
        />
        <Select
          showSearch
          style={{ width: "100%", marginBottom: 16 }}
          placeholder="Selecciona una moneda"
          value={monedaSeleccionada?.id ?? null}
          onChange={(id) => {
            const seleccion = monedas.find((m) => m.id === id);
            setMonedaSeleccionada(seleccion);
          }}
        >
          {monedas.map((moneda) => (
            <Option key={moneda.id} value={moneda.id}>
              {`${moneda.descripcion} (${moneda.abreviatura}) - TC: ${moneda.tipoCambio}`}
            </Option>
          ))}
        </Select>

        {monedaSeleccionada && valorIngreso > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">Tipo de cambio:</Text>{" "}
            <strong>{monedaSeleccionada.tipoCambio}</strong>
            <br />
            <Text type="secondary">Equivalente en Lempiras:</Text>{" "}
            <strong>L. {(valorIngreso * monedaSeleccionada.tipoCambio).toFixed(2)}</strong>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onCancel}>Cancelar</Button>
          <Button
            type="primary"
            disabled={valorIngreso <= 0 || !monedaSeleccionada}
            onClick={handleAceptar}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalIngresoPago;