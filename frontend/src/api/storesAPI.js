import apiClient from './axios';

export const fetchStores = async () => {
  try {
    const res = await apiClient.get('/api/stores');
    return res.data;
  } catch (err) {
    throw new Error("Error al obtener tiendas", err);
  }
};

export const createStore = async (data) => {
  try {
    const res = await apiClient.post('/api/stores', data);
    return res.data;
  } catch (err) {
    throw new Error("Error al crear tienda", err);
  }
};

export const fetchStoreById = async (id) => {
  try {
    const res = await apiClient.get(`/api/stores/${id}`);
    return res.data;
  } catch (err) {
    throw new Error("Error al obtener la tienda", err);
  }
};

export const updateStore = async (id, data) => {
  try {
    const res = await apiClient.put(`/api/stores/${id}`, data);
    return res.data;
  } catch (err) {
    throw new Error("Error al actualizar tienda", err);
  }
};

export const deleteStore = async (id) => {
  try {
    await apiClient.delete(`/api/stores/${id}`);
  } catch (err) {
    throw new Error("Error al eliminar tienda", err);
  }
};

export const fetchInventarioByStore = async (storeId) => {
  try {
    const res = await apiClient.get(`/api/inventario/by-store/${storeId}`);
    return res.data;
  } catch (err) {
    throw new Error("Error al obtener inventario", err);
  }
};

export const fetchCajasByStore = async (storeId) => {
  try {
    const res = await apiClient.get(`/api/cash-registers/by-store/${storeId}`);
    return res.data;
  } catch (err) {
    throw new Error("Error al obtener Cajas", err);
  }
};
