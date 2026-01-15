import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="No tienes permiso para acceder a esta página."
      extra={<Button type="primary" onClick={() => navigate('/home')}>Volver</Button>}
    />
  );
};

export default Unauthorized;
