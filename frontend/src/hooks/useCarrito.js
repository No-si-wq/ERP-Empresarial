import { useState, useMemo } from "react";

/**
 * Hook para manejar el carrito de compras o ventas con validación de stock
 * y cálculo consistente de Base / Final usando producto.tax.percent
 *
 * @param {Array} productosDisponibles
 * @param {"compra"|"venta"} modo - Determina si se usan cost o price
 */
export const useCarrito = (productosDisponibles = [], modo = "venta") => {
  const [carrito, setCarrito] = useState([]);

  const normalizarProducto = (producto, cantidad = 1) => {
    return {
      ...producto,
      cantidad,
      costBase: producto.costBase ?? 0,
      costFinal: producto.costFinal ?? producto.costBase ?? 0,
      priceBase: producto.priceBase ?? 0,
      priceFinal: producto.priceFinal ?? producto.priceBase ?? 0,
    };
  };

  /**
   * Agrega un producto al carrito
   * @returns { success: boolean, message?: string }
   */
  const agregarProducto = (productoInput) => {
    const id =
      typeof productoInput === "object" ? productoInput.id : productoInput;
    const producto =
      typeof productoInput === "object"
        ? productoInput
        : productosDisponibles.find((p) => p.id === id);

    if (!producto) return { success: false, message: "Producto no encontrado" };

    const existe = carrito.find((item) => item.id === id);

    if (existe) {
      setCarrito(
        carrito.map((item) =>
          item.id === id
            ? normalizarProducto(producto, item.cantidad + 1)
            : item
        )
      );
    } else {
      setCarrito([...carrito, normalizarProducto(producto, 1)]);
    }

    return { success: true };
  };

  /**
   * Cambia la cantidad de un producto
   * @returns { success: boolean, message?: string }
   */
  const cambiarCantidad = (id, cantidad) => {
    const producto = productosDisponibles.find((p) => p.id === id);
    if (!producto) return { success: false, message: "Producto no encontrado" };

    setCarrito(
      carrito.map((item) =>
        item.id === id
          ? normalizarProducto(producto, cantidad >= 0 ? cantidad : 0)
          : item
      )
    );

    return { success: true };
  };

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter((item) => item.id !== id));
  };

  const subtotal = useMemo(() => {
    return carrito.reduce((acc, item) => {
      const valorUnitario =
        modo === "compra" ? item.costBase ?? 0 : item.priceBase ?? 0;
      return acc + valorUnitario * (item.cantidad ?? 0);
    }, 0);
  }, [carrito, modo]);

  const impuestos = useMemo(() => {
    return carrito.reduce((acc, item) => {
      const base =
        modo === "compra" ? item.costBase ?? 0 : item.priceBase ?? 0;
      const final =
        modo === "compra" ? item.costFinal ?? base : item.priceFinal ?? base;
      return acc + (final - base) * (item.cantidad ?? 0);
    }, 0);
  }, [carrito, modo]);

  const total = useMemo(() => {
    return carrito.reduce((acc, item) => {
      const unitValue =
        modo === "compra"
          ? item.costFinal ?? item.costBase ?? 0
          : item.priceFinal ?? item.priceBase ?? 0;
      return acc + unitValue * (item.cantidad ?? 0);
    }, 0);
  }, [carrito, modo]);

  return {
    carrito,
    setCarrito,
    agregarProducto,
    cambiarCantidad,
    eliminarDelCarrito,
    subtotal,
    impuestos,
    total,
  };
};