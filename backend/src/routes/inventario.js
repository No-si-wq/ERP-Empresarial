const express = require("express");
const router = express.Router();

router.get("/tienda/:id", async (req, res) => {
  const storeId = parseInt(req.params.id, 10);
  if (isNaN(storeId)) {
    return res.status(400).json({ error: "ID de tienda inválido" });
  }

  try {
    const productos = await req.prisma.product.findMany({
      where: { storeId },
      include: {
        category: true,
        store: true,
        tax: { select: { id: true, clave: true, descripcion: true, percent: true } },
      },
    });

    res.json(productos);
  } catch (error) {
    console.error("Error al consultar inventario:", error);
    res.status(500).json({ error: "Error al consultar inventario" });
  }
});

module.exports = router;
