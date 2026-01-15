import { usePermissions } from "../hooks/usePermissions";
import React, { useContext, useState } from "react";
import { Layout, Menu, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../hooks/AuthProvider";
import { LogoutOutlined } from "@ant-design/icons";
import { Typography } from 'antd';

const Home = () => {
  const { handleLogout } = useContext(AuthContext);
  const { modules } = usePermissions(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedKey, setSelectedKey] = useState(null);
  const { Header, Content } = Layout;
  const { Title, Text } = Typography;

  const filteredModules = modules;

  const handleMenuClick = (e) => {
    setSelectedKey(e.key);
    for (const mod of filteredModules) {
      if (mod.submenu) {
        const found = mod.submenu.find((sm) => sm.key === e.key);
        if (found && found.path) {
          navigate(found.path);
          return;
        }
      }
    }
  };

  const handleLogoutClick = () => {
    handleLogout();
    navigate('/login')
  };

  const isWelcome = location.pathname === "/home";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          background: "#fff",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 2px 8px #f0f1f2",
          zIndex: 10,
        }}
      >
        <div style={{ flex: 1 }}>
      <Menu
        mode="horizontal"
        selectedKeys={selectedKey ? [selectedKey] : []}
        onClick={handleMenuClick}
        style={{ borderBottom: "none" }}
      >
        {filteredModules.map((mod) =>
          mod.submenu ? (
            <Menu.SubMenu
              key={mod.key}
              title={mod.title}
              icon={mod.icon}
              popupClassName="ribbon-submenu"
            >
              {mod.submenu.map((sm) => (
                <Menu.Item key={sm.key} icon={sm.icon}>
                  {sm.title}
                </Menu.Item>
              ))}
            </Menu.SubMenu>
          ) : (
            <Menu.Item key={mod.key} icon={mod.icon}>
              {mod.title}
            </Menu.Item>
          )
        )}
      </Menu>
        </div>
        <Button
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogoutClick}
          style={{ marginLeft: 16 }}
        >
          Cerrar sesión
        </Button>
      </Header>
      <Content
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          background: "linear-gradient(135deg, #f0f5ff 0%, #fffbe6 100%)",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {isWelcome && (
          <div
            style={{
              background: "#fff",
              padding: 48,
              borderRadius: 12,
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              textAlign: "center",
              maxWidth: 600,
              width: "100%",
            }}
          >
            <Title level={2}>¡Bienvenido al ERP!</Title>
            <Text type="secondary">
              Selecciona un módulo o una acción en el menú superior para comenzar a trabajar en tu sistema.
            </Text>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Home;