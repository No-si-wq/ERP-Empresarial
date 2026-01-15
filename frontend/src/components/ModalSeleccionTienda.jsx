import React, { useState, useEffect } from "react";
import { Modal, Select } from "antd";

/**
 * Modal para seleccionar tienda y mostrador
 * 
 * @param {boolean} open
 * @param {Array} tiendas
 * @param {number|null} tiendaSeleccionada
 * @param {number|null} mostradorSeleccionado
 * @param {Function} onSeleccion - (tiendaId, cajaId)
 * @param {Function} onClose
 */
const ModalSeleccionTienda = ({
  open,
  tiendas,
  tiendaSeleccionada,
  mostradorSeleccionado,
  onSeleccion,
  onClose
}) => {
  const [tienda, setTienda] = useState(null);
  const [mostrador, setMostrador] = useState(null);

  useEffect(() => {
    if (open) {
      setTienda(tiendaSeleccionada || null);
      setMostrador(mostradorSeleccionado || null);
    }
  }, [open, tiendaSeleccionada, mostradorSeleccionado]);

  const handleOk = () => {
    onSeleccion(tienda, mostrador);
    onClose();
  };

  const tiendaActual = tiendas.find(t => t.id === tienda);

  return (
    <Modal
      open={open}
      title="Selecciona la Tienda y Mostrador"
      onCancel={onClose}
      onOk={handleOk}
      okButtonProps={{ disabled: !tienda || !mostrador }}
    >
      <div style={{ marginBottom: 12 }}>
        <label>Tienda:</label>
        <Select
          style={{ width: "100%" }}
          placeholder="Selecciona una tienda"
          value={tienda}
          onChange={(val) => {
            setTienda(val);
            setMostrador(null);
          }}
        >
          {tiendas.map(tienda => (
            <Select.Option key={tienda.id} value={tienda.id}>
              {tienda.nombre}
            </Select.Option>
          ))}
        </Select>
      </div>
      <div>
        <label>Mostrador</label>
        <Select
          style={{ width: "100%" }}
          placeholder="Selecciona un mostrador (opcional)"
          value={mostrador}
          onChange={(val) => setMostrador(val)}
          disabled={!tiendaActual}
          allowClear
        >
          {tiendaActual?.cajas?.map(caja => (
            <Select.Option key={caja.id} value={caja.id}>
              {caja.descripcion || `Caja ${caja.numeroDeCaja}`}
            </Select.Option>
          ))}
        </Select>
      </div>
    </Modal>
  );
};

export default ModalSeleccionTienda;