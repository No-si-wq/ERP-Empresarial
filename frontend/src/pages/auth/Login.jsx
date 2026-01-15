import React, { useState, useContext } from 'react';
import { Form, Input, Button, Typography, Card, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/axios';
import { AuthContext } from '../../hooks/AuthProvider';

const { Title } = Typography;

const containerStyle = {
  minHeight: '100vh',
  minWidth: '100vw',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)',
  padding: '0',
  margin: '0',
  position: 'fixed',
  top: 0,
  left: 0,
};

const cardStyle = {
  width: '100%',
  maxWidth: 350,
  borderRadius: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
  padding: '24px 16px',
};

const Login = () => {
  const { handleLogin } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', values);

      const { token, username, roleId, roleName, permissions } = response.data;

      await handleLogin({
        token,
        username,
        roleId,
        roleName,
        permissions: permissions ?? [],
      });

      navigate('/home');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3}>Iniciar Sesión</Title>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          style={{ width: '100%' }}
        >
          <Form.Item
            name="username"
            label="Usuario"
            rules={[{ required: true, message: 'Por favor ingresa tu usuario' }]}
            style={{ marginBottom: 16 }}
          >
            <Input prefix={<UserOutlined />} placeholder="Usuario" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
            style={{ marginBottom: 16 }}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Contraseña" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={loading}
            >
              Entrar
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;