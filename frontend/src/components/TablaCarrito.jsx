import React from "react";
import { Table, InputNumber, Button } from "antd";
import { DeleteOutlined } from "@ant-design/icons";

/**
 * Tabla de productos en el carrito (unificada para compra y venta)
 *
 * @param {Array} items - Lista de productos en el carrito
 * @param {Function} onCantidadChange - Función para cambiar cantidad
 * @param {Function} onEliminar - Función para eliminar producto
 * @param {number} total - Total general
 * @param {boolean} mostrarResumen - Mostrar fila de resumen
 * @param {"venta"|"compra"} modo - Modo de la tabla
 */
const TablaCarrito = ({
  items = [],
  onCantidadChange,
  onEliminar,
  total = 0,
  mostrarResumen = true,
  modo = "venta",
}) => {
  const safeNumber = (value) => Number(value ?? 0);

  const etiquetas = {
    compra: { base: "Costo Base", final: "Costo Final" },
    venta: { base: "Precio Base", final: "Precio Final" },
  };

  const baseColumns = [
    {
      title: "Cantidad",
      dataIndex: "cantidad",
      key: "cantidad",
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={safeNumber(record.cantidad)}
          onChange={(value) => onCantidadChange?.(record.id, value)}
        />
      ),
    },
    { title: "Artículo", dataIndex: "name", key: "name", width: 150 },
    { title: "Descripción", dataIndex: "description", key: "description", width: 200 },
    {
      title: etiquetas[modo].base,
      dataIndex: modo === "compra" ? "costBase" : "priceBase",
      key: "base",
      width: 100,
      render: (value) => `L. ${safeNumber(value).toFixed(2)}`,
    },
    {
      title: etiquetas[modo].final,
      dataIndex: modo === "compra" ? "costFinal" : "priceFinal",
      key: "final",
      width: 100,
      render: (value) => `L. ${safeNumber(value).toFixed(2)}`,
    },
    {
      title: "Subtotal Base",
      key: "subtotalBase",
      width: 120,
      render: (_, record) => {
        const base = modo === "compra" ? record.costBase : record.priceBase;
        const subtotal = safeNumber(base) * safeNumber(record.cantidad);
        return `L. ${subtotal.toFixed(2)}`;
      },
    },
    {
      title: "Subtotal Final",
      key: "subtotalFinal",
      width: 120,
      render: (_, record) => {
        const final = modo === "compra" ? record.costFinal : record.priceFinal;
        const subtotal = safeNumber(final) * safeNumber(record.cantidad);
        return `L. ${subtotal.toFixed(2)}`;
      },
    },
  ];

  const actionColumn = {
    title: "",
    dataIndex: "id",
    width: 50,
    render: (id) => (
      <Button
        icon={<DeleteOutlined />}
        danger
        size="small"
        onClick={() => onEliminar?.(id)}
      />
    ),
  };

  return (
    <Table
      columns={[...baseColumns, actionColumn]}
      dataSource={items}
      rowKey="id"
      pagination={false}
      size="small"
      scroll={{ x: true }}
      summary={() =>
        mostrarResumen && (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={baseColumns.length - 1}>
              <b>Total:</b>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>
              <b>L. {safeNumber(total).toFixed(2)}</b>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )
      }
    />
  );
};

export default TablaCarrito;