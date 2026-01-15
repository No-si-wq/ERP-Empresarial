import { useState, useEffect } from "react";
import { message, Modal } from "antd";
import apiClient from "../api/axios";

export const useCajas = (storeId) => {
  const [cajas, setCajas] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCajas = async () => {
    if (!storeId) {
      setCajas([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/api/cash-registers/by-store/${storeId}`);
      setCajas(data);
    } catch (err) {
      console.error(err);
      message.error("Error al cargar cajas");
    }
    setLoading(false);
  };

  const fetchStores = async () => {
    try {
      const { data } = await apiClient.get('/api/stores');
      setStores(data);
    } catch (err) {
      message.error("Error al cargar tiendas");
      console.error(err);
    }
  };

  const createCaja = async (values) => {
    try {
      await apiClient.post(`/api/cash-registers/tienda/${values.storeId}`, values);
      message.success("Caja creada");
      fetchCajas();
    } catch (err) {
      message.error("Error al crear caja");
      console.error(err);
    }
  };

  const updateCaja = async (id, values) => {
    try {
      await apiClient.put(`/api/cash-registers/${id}`, values);
      message.success("Caja actualizada");
      fetchCajas();
    } catch (err) {
      message.error("Error al actualizar caja");
      console.error(err);
    }
  };

  const deleteCaja = async (id) => {
    try {
      await apiClient.delete(`/api/cash-registers/${id}`);
      message.success("Caja eliminada");
      fetchCajas();
    } catch (err) {
      message.error("Error al eliminar caja");
      console.error(err);
    }
  };

  const validateClave = async (_, value, editMode = false) => {
    if (!value || editMode) return Promise.resolve();

    try {
      const { data } = await apiClient.get(`/api/cash-registers/check-clave/${value}`);

      if (data.exists) {
        Modal.error({
          title: "Número duplicado",
          content: `El número "${value}" ya está registrado.`,
          okText: "Aceptar",
        });
        return Promise.reject(new Error("El número ya existe"));
      }

      return Promise.resolve();
    } catch (error) {
      console.error("Error al validar clave:", error);
      Modal.error({
        title: "Error de validación",
        content: "No se pudo verificar la clave en este momento.",
        okText: "Aceptar",
      });
      return Promise.reject(new Error("Error al validar clave"));
    }
  };

  const getNextClave = async () => {
    try {
      const { data } = await apiClient.get('/api/cash-registers/next-clave');
      return data.clave;
    } catch {
      message.error("No se pudo obtener el número de caja");
      return null;
    }
  };

  useEffect(() => {
    if (storeId) {
      fetchCajas();
    } else {
      setCajas([]);
    }
    fetchStores();
  }, [storeId]);

  return {
    cajas,
    stores,
    loading,
    fetchCajas,
    fetchStores,
    createCaja,
    updateCaja,
    deleteCaja,
    validateClave,
    getNextClave,
  };
};