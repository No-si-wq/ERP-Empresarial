import { useState, useEffect } from "react";
import { fetchStores } from "../api/storesAPI";

export const useTiendas = () => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTiendas = async () => {
    setLoading(true);
    try {
      const data = await fetchStores();
      if (Array.isArray(data)) {
        const tiendas = data.map((tienda) => ({
          title: tienda.nombre,
          key: `store-${tienda.id}`,
          icon: "shop",
          children: [
            {
              title: "Cajas",
              key: `store-${tienda.id}-cajas`,
              icon: "appstore",
              storeId: tienda.id,
              tipo: "cajas",
            },
            {
              title: "Inventarios",
              key: `store-${tienda.id}-inventario`,
              icon: "database",
              storeId: tienda.id,
              tipo: "inventario",
            },
            {
              title: "Políticas",
              key: `store-${tienda.id}-politicas`,
              icon: "percentage",
              storeId: tienda.id,
              tipo: "politicas",
            },
          ],
        }));

        setTreeData(tiendas);
      } else {
        setError("Los datos recibidos no son válidos.");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error al obtener tiendas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiendas();
  }, []);

  return { treeData, setTreeData, loading, error, fetchTiendas };
};
