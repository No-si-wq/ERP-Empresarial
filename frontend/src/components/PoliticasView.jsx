import React from "react";
import { Card } from "antd";

const PoliticasView = ({ tiendaClave }) => {
  return (
    <Card title={`Políticas de oferta - ${tiendaClave}`}>
      <p>Aquí irían las promociones, descuentos, políticas por categoría, etc.</p>
    </Card>
  );
};

export default PoliticasView;