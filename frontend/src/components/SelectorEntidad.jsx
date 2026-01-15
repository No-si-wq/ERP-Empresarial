import React from "react";
import { Select, Button, Space } from "antd";
import { UserAddOutlined } from "@ant-design/icons";

/**
 * Selector genérico para clientes o proveedores
 * 
 * @param {Object} props
 * @param {string} label - Texto del campo, por ejemplo "Cliente" o "Proveedor"
 * @param {number|null} value - ID seleccionado
 * @param {Array} opciones - Lista de entidades { id, name }
 * @param {Function} onSelect - Función al seleccionar
 * @param {Function} onNuevo - Función al hacer clic en el botón de nuevo
 * @param {boolean} disabled - Si el selector debe estar deshabilitado
 */
const SelectorEntidad = ({
  label = "Entidad",
  value,
  opciones = [],
  onSelect,
  onNuevo,
  disabled = false,
}) => {
  return (
    <Space>
      <Select
        showSearch
        style={{ width: 250 }}
        placeholder={`Selecciona ${label.toLowerCase()}`}
        value={typeof value === "object" ? value?.id : value}
        options={opciones.map((opt) => ({
          label: opt.name,
          value: opt.id,
        }))}
        onChange={onSelect}
        onSelect={onSelect}
        disabled={disabled}
        filterOption={(input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
      />
      {!disabled && (
        <Button icon={<UserAddOutlined />} onClick={onNuevo} />
      )}
    </Space>
  );
};

export default SelectorEntidad;