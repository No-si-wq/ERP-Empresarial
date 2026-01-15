import React from "react";
import { Select } from "antd";

/**
 * Selector de productos con búsqueda
 *
 * @param {Object} props
 * @param {Array} productos - Lista de productos con { id, name }
 * @param {Function} onSelect - Callback al seleccionar un producto completo
 * @param {Function} onChange - Callback de cambio de valor (controlado)
 * @param {any} value - Valor actual seleccionado
 * @param {boolean} disabled - Si el selector debe estar deshabilitado
 */
const SelectorProductos = ({ productos = [], onSelect, value, onChange, disabled = false }) => {
  return (
    <Select
      disabled={disabled}
      showSearch
      placeholder="Buscar o seleccionar producto"
      style={{ width: 300 }}
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      options={productos.map(p => ({
        label: p.name,
        value: p.id,
      }))}
      value={value}
      onChange={(valueSeleccionado) => {
        onChange(valueSeleccionado);
        const producto = productos.find(p => p.id === valueSeleccionado);
        if (producto) {
          onSelect(producto);
        }
      }}
    />
  );
};

export default SelectorProductos;