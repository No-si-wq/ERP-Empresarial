import React, { useEffect, useState } from "react";
import {
  Layout, Menu, Button, Typography, message, Modal
} from "antd";
import {
  PlusOutlined, ReloadOutlined, UserAddOutlined, ShoppingCartOutlined, DollarOutlined, PauseCircleOutlined
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";

import ClienteForm from "../components/ClienteForm";
import TablaCarrito from "../components/TablaCarrito";
import SelectorEntidad from "../components/SelectorEntidad";
import SelectorProductos from "../components/SelectorProductos";
import ModalSeleccionTienda from "../components/ModalSeleccionTienda";
import ModalIngresoPago from "../components/ModalIngresoPago";
import PanelResumenPago from "../components/PanelResumenPago";
import { useCarrito } from "../hooks/useCarrito";
import apiClient from "../api/axios";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const Ventas = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idVenta = searchParams.get("id");
  const modoVista = searchParams.get("view") === "true";
  const [creditoCliente, setCreditoCliente] = useState({
    creditLimit: 0,
    creditBalance: 0,
    creditDays: 0,
    creditAvailable: 0
  });

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [modalCliente, setModalCliente] = useState(false);
  const [clienteLoading, setClienteLoading] = useState(false);

  const [metodosPago, setMetodosPago] = useState([]);
  const [modalSeleccionTienda, setModalSeleccionTienda] = useState(false);
  const [tiendasDisponibles, setTiendasDisponibles] = useState([]);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState(null);
  const [mostradorSeleccionado, setMostradorSeleccionado] = useState(null);
  const ventaHabilitada = Boolean(tiendaSeleccionada && mostradorSeleccionado);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null); 
  const [folioEstimado, setFolioEstimado] = useState("");
  const [folioReal, setFolioReal] = useState("");
  const esEdicion = Boolean(idVenta);

  const [modalPanelPago, setModalPanelPago] = useState(false);
  const [modalRecibido, setModalRecibido] = useState(false);
  const [pagosRecibidos, setPagosRecibidos] = useState([]);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null);
  const [valorIngreso, setValorIngreso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [monedas, setMonedas] = useState([]);
  const folioAMostrar = esEdicion ? folioReal : folioEstimado;
  const modo = "venta";

  const {
    carrito,
    setCarrito,
    agregarProducto,
    cambiarCantidad,
    eliminarDelCarrito,
    subtotal,
    impuestos,
    total
  } = useCarrito(productos, modo);

  const isCreditoVencido = (cliente) => {
    if (!cliente) return true;
    const hoy = new Date();
    const fechaBase = cliente.updatedAt ? new Date(cliente.updatedAt) : new Date();
    const fechaLimite = new Date(fechaBase);
    fechaLimite.setDate(fechaBase.getDate() + cliente.creditDays);
    return hoy > fechaLimite;
  };

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await apiClient.get('/api/clientes');
        setClientes(res.data);
      } catch {
        message.error("No se pudieron cargar los clientes");
      }
    };
    const fetchMetodosPago = async () => {
      try {
      const res = await apiClient.get('/api/payment-methods');
      setMetodosPago(res.data.data);
      } catch {
        message.error("No se pudieron cargar los métodos de pago");
      }
    };
    fetchClientes();
    fetchMetodosPago();
  }, []);

  useEffect(() => {
    if (!clienteSeleccionado) return;
    const cliente = clientes.find(c => c.id === clienteSeleccionado);
    if (cliente) {
      const creditLimit = Number(cliente.creditLimit) || 0;
      const creditBalance = Number(cliente.creditBalance) || 0;
      const creditDays = Number(cliente.creditDays) || 0;
      const creditAvailable = creditLimit - creditBalance;

      setCreditoCliente({
        id: cliente.id,
        creditLimit,
        creditBalance,
        creditDays,
        creditAvailable,
        updatedAt: cliente.updatedAt,
      });
    }
  }, [clienteSeleccionado, clientes]);

  useEffect(() => {
    if (esEdicion) {
      apiClient.get(`/api/ventas/${idVenta}`)
        .then(({ data }) => {
          setFolioReal(data.folio);
          setClienteSeleccionado(data.clientId ?? null);
          setTiendaSeleccionada(data.storeId ?? null);
          setMostradorSeleccionado(data.cajaId ?? null);
          setPagosRecibidos(data.formasPago ?? []);

          const productosVenta = data.productos.map(p => ({
            id: p.productoId,
            name: p.producto ?? "Producto eliminado",
            priceBase: p.priceBase,
            priceFinal: p.priceFinal,
            cantidad: p.cantidad,
            totalBase: p.priceBase * p.cantidad,
            totalFinal: p.priceFinal * p.cantidad
          }));

          setCarrito(productosVenta);
          message.success("Venta cargada correctamente");
        })
        .catch(err => {
          console.error("Error al cargar venta:", err);
          message.error("No se pudo cargar la venta para edición");
        });
    }
  }, [esEdicion, idVenta]);

  const fetchFolioEstimado = async (cajaId) => {
    if (!cajaId) return;
    try {
      const res = await apiClient.get(`/api/ventas/next-folio-estimado/${cajaId}`);
      setFolioEstimado(res.data.folio);
    } catch (err) {
      console.error(err);
      setFolioEstimado("ERROR");
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await apiClient.get('/api/currencies');
        setMonedas(res.data.data);  
      } catch (error) {
        message.error("Error al cargar las monedas");
        console.error(error);
      }
    };

  useEffect(() => {
  if (modalRecibido) {
    fetchCurrencies();
  }
}, [modalRecibido]);

  useEffect(() => {
    const fetchTiendas = async () => {
      try {
        const res = await apiClient.get('/api/stores');
        setTiendasDisponibles(res.data);
        if (!idVenta) setModalSeleccionTienda(true);
      } catch {
        message.error("No se pudieron cargar las tiendas");
      }
    };
    fetchTiendas();
  }, [idVenta]);

  useEffect(() => {
    const fetchProductos = async () => {
      if (!tiendaSeleccionada) return;
      try {
        const res = await apiClient.get(`/api/inventario/by-store/${tiendaSeleccionada}`);
        setProductos(res.data);
      } catch {
        message.error("No se pudieron cargar los productos");
      }
    };
    if (tiendaSeleccionada) fetchProductos();
  }, [tiendaSeleccionada]);

  useEffect(() => {
    if (tiendaSeleccionada && mostradorSeleccionado && !esEdicion) {
      fetchFolioEstimado(mostradorSeleccionado);
    }
  }, [tiendaSeleccionada, mostradorSeleccionado, esEdicion]);

  const handleRegistrarVenta = async () => {
    if (!clienteSeleccionado || carrito.length === 0) {
      message.warning("Completa todos los campos obligatorios");
      return;
    }

    if (clienteSeleccionado && carrito.length > 0) {
      const pagoCredito = pagosRecibidos.some(p => p.metodo.startsWith("CRED"));

      if (pagoCredito) {
        if (creditoCliente.creditAvailable < total) {
          message.error("El cliente no tiene suficiente crédito disponible para esta venta");
          setLoading(false);
          return;
        }

        if (isCreditoVencido(creditoCliente)) {
          message.error("El crédito del cliente está vencido. Debe realizar pagos antes de continuar.");
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);

    const payload = {
      clienteId: clienteSeleccionado,
      storeId: tiendaSeleccionada,
      cajaId: mostradorSeleccionado,
      productos: carrito.map(({ id, cantidad, priceBase, priceFinal }) => ({
        productoId: id,
        cantidad,
        priceBase,
        priceFinal
      })),
      formasPago: pagosRecibidos,
      importeRecibido: pagosRecibidos.reduce((acc, p) => acc + (p.importe || 0), 0),
      cambio: pagosRecibidos.reduce((acc, p) => acc + (p.importe || 0), 0) - total
    };

    try {
      if (esEdicion) {
        await apiClient.put(`/api/ventas/${idVenta}`, payload);
        message.success("Venta actualizada correctamente");
        navigate("/ventas/panel");
      } else {
        await apiClient.post("/api/ventas", payload);
        message.success("Venta registrada correctamente");
        setCarrito([]);
        setPagosRecibidos([]);
        setClienteSeleccionado(null);
        setModalPanelPago(false);
        if (mostradorSeleccionado) {
          fetchFolioEstimado(mostradorSeleccionado);
        }
      }
    } catch (error) {
      console.error("Error al registrar venta:", error);
      const msg = error.response?.data?.error || "No se pudo registrar la venta";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarPendiente = async () => {
    if (!clienteSeleccionado || carrito.length === 0) {
      message.warning("Completa todos los campos obligatorios antes de guardar como pendiente");
      return;
    }

    setLoading(true);

    const payload = {
      clienteId: clienteSeleccionado,
      storeId: tiendaSeleccionada,
      cajaId: mostradorSeleccionado,
      productos: carrito.map(({ id, cantidad, priceBase, priceFinal }) => ({
        productoId: id,
        cantidad,
        priceBase,
        priceFinal
      })),
      formasPago: pagosRecibidos,
      importeRecibido: pagosRecibidos.reduce((acc, p) => acc + (p.importe || 0), 0),
      cambio: pagosRecibidos.reduce((acc, p) => acc + (p.importe || 0), 0) - total
    };

    try {
      if (esEdicion) {
        await apiClient.put(`/api/ventas/${idVenta}`, payload);
        message.success("Venta actualizada y emitida");
        navigate("/ventas/panel");
      } else {
        await apiClient.post("/api/ventas/pendiente", payload);
        message.success("Venta guardada como PENDIENTE");
        setCarrito([]);
        setPagosRecibidos([]);
        setClienteSeleccionado(null);
        setProductoSeleccionado(null);
        if (mostradorSeleccionado) {
          fetchFolioEstimado(mostradorSeleccionado);
        }
      }
    } catch (err) {
      console.error("Error al guardar venta:", err);
      const msg = err.response?.data?.error || "No se pudo guardar la venta";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const ribbon =  (
    <Menu mode="horizontal" style={{ marginBottom: 8 }}>
      <Menu.Item key="nueva" icon={<PlusOutlined />} onClick={() => { setCarrito([]); setPagosRecibidos([]); }}>
        Nueva venta
      </Menu.Item>
      <Menu.Item key="pendiente" icon={<PauseCircleOutlined />} onClick={handleGuardarPendiente}>
        Guardar como pendiente
      </Menu.Item>
      <Menu.Item key="recargar" icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
        Recargar
      </Menu.Item>
      <Menu.Item key="clientes" icon={<UserAddOutlined />} onClick={() => setModalCliente(true)}>
        Nuevo cliente
      </Menu.Item>
      <Menu.Item key="inicio" icon={<ShoppingCartOutlined />} onClick={() => navigate("/home")} style={{ float: "right" }}>
        Ir al inicio
      </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ background: "#f4f6fa", padding: "0 16px", boxShadow: "0 1px 4px #eee" }}>{ribbon}</Header>
      <Content style={{ padding: 16, background: "#eaf0fb" }}>
        <div style={{ maxWidth: 1200, margin: "auto", background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px #d5deef" }}>
          <Title level={4}>Punto de Venta</Title>
          <Text type="secondary" style={{ fontSize: 18, fontWeight: "bold" }}>
            FOLIO: {folioAMostrar}
          </Text>
          {!ventaHabilitada && (
            <div style={{ background: "#fff3cd", padding: 16, margin: "16px 0", border: "1px solid #ffeeba", borderRadius: 6 }}>
              <Text strong>Debes seleccionar una tienda y un mostrador para comenzar</Text>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span>Cliente:</span>
              <SelectorEntidad
                label="Cliente"
                value={clienteSeleccionado}
                opciones={clientes}
                onSelect={!esEdicion && !modoVista ? setClienteSeleccionado : undefined}
                onNuevo={!esEdicion && !modoVista ? () => setModalCliente(true) : undefined}
                disabled={modoVista || esEdicion}
                
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span>Agregar producto:</span>
              <SelectorProductos
                productos={productos}
                onSelect={!modoVista ? (producto) => {
                  agregarProducto({
                    id: producto.id,
                    name: producto.name,
                    description: producto.description,
                    priceBase: producto.priceBase ?? 0,
                    priceFinal: producto.priceFinal ?? producto.priceBase ?? 0,
                    cantidad: 1,
                  });
                  setProductoSeleccionado(null);
                } : undefined}
                value={productoSeleccionado}
                onChange={!modoVista ? setProductoSeleccionado : undefined}
                disabled={!ventaHabilitada || modoVista}
              />
            </div>
            <TablaCarrito
              items={carrito}
              onCantidadChange={!modoVista ? cambiarCantidad : undefined}
              onEliminar={!modoVista ? eliminarDelCarrito : undefined}
              subtotal={subtotal}     
              impuestos={impuestos}   
              total={total}           
              modo={modo}
              soloLectura={modoVista}
            />
            <Button
              type="primary"
              size="large"
              icon={<DollarOutlined />}
              block
              style={{ fontSize: 24, height: 60 }}
              onClick={() => { setModalPanelPago(true)}}
              disabled={!ventaHabilitada || carrito.length === 0 || loading || modoVista}
            >
              PAGAR
            </Button>
          </div>
        </div>
      </Content>

      {!modoVista && (
      <ClienteForm
        visible={modalCliente}
        onCreate={async values => {
          setClienteLoading(true);
          try {
              const res = await apiClient.post('/api/clientes', values);
              setClientes(prev => [...prev, res.data]);
              setClienteSeleccionado(res.data.id);
              setModalCliente(false);
              message.success("Cliente agregado");
          } catch {
            message.error("Error al agregar cliente");
          }
          setClienteLoading(false);
        }}
        onCancel={() => setModalCliente(false)}
        confirmLoading={clienteLoading}
      />)}

      <ModalSeleccionTienda
        open={modalSeleccionTienda}
        tiendas={tiendasDisponibles}
        tiendaSeleccionada={tiendaSeleccionada}
        mostradorSeleccionado={mostradorSeleccionado}
        onSeleccion={(tiendaId, cajaId) => {
          setTiendaSeleccionada(tiendaId);
          setMostradorSeleccionado(cajaId);
        }}
        onClose={() => setModalSeleccionTienda(false)}
      />

      <Modal
        open={modalPanelPago}
        onCancel={() => setModalPanelPago(false)}
        footer={null}
        width={400}
        centered
        destroyOnClose
      >
          <PanelResumenPago
            metodosPago={metodosPago.map(mp => ({ key: mp.id, descripcion: `${mp.clave} - ${mp.descripcion}` }))}
            subtotal={subtotal}   
            impuestos={impuestos} 
            total={total}         
            pagosRecibidos={pagosRecibidos}
            onAgregarPago={(metodoPagoSeleccionado) => {
              if (metodoPagoSeleccionado.descripcion.startsWith("CRED")) {
                if (creditoCliente.creditAvailable < total) {
                  message.error("No hay crédito suficiente para usar este método");
                  return;
                }

                if (isCreditoVencido(creditoCliente)) {
                  message.error("El crédito del cliente está vencido");
                  return;
                }
              }
              setMetodoSeleccionado(metodoPagoSeleccionado);
              setTimeout(() => setModalRecibido(true), 250);
            }}
            onEliminarPago={(pago, index) => {
              setPagosRecibidos(prev => prev.filter((_, i) => i !== index));
            }}
            onConfirmarPago={handleRegistrarVenta}
            onCancelar={() => setModalPanelPago(false)}
          />
      </Modal>

      <ModalIngresoPago
        open={modalRecibido}
        onCancel={() => {
          setModalRecibido(false);
          setMetodoSeleccionado(null);
          setValorIngreso(0);
        }}
        valorIngreso={valorIngreso}
        setValorIngreso={setValorIngreso}
        metodoPago={metodoSeleccionado}
        monedas={monedas}
        totalOperacion={total}
        modo={modo}
        onAceptar={({ valorOriginal, valorConvertido, moneda, metodo }) => {
          setPagosRecibidos(prev => [
            ...prev,
            {
              metodo: metodo.descripcion,
              importe: valorConvertido,
              importeOriginal: valorOriginal,
              abreviatura: moneda.abreviatura
            }
          ]);
          setModalRecibido(false);
          setTimeout(() => setModalPanelPago(true), 250);
        }}
      />
    </Layout>
  );
};

export default Ventas;