import { usePermissions } from "../hooks/usePermissions";
import { AppstoreAddOutlined } from "@ant-design/icons";
import React, { useContext, useState } from "react";
import { Layout, Menu, Button } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../hooks/AuthProvider";
import { LogoutOutlined } from "@ant-design/icons";
import { Typography, Space } from 'antd';

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
              padding: "60px 40px",
              borderRadius: 20,
              boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
              textAlign: "center",
              maxWidth: 550,
              width: "100%",
              border: "1px solid #f0f0f0"
            }}
          >
            <div style={{
              width: 80,
              height: 80,
              background: "#e6f7ff",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24x auto",
            }}>
              <AppstoreAddOutlined />
            </div>

            <Title level={2} style={{ marginBottom: 12, fontWeight: 700, color: "#262626" }}>
                ¡Hola de nuevo!
              </Title>
              
              <Text type="secondary" style={{ fontSize: 16, display: "block", lineHeight: "1.6" }}>
                Tu panel de control está listo. 
                <span style={{ display: "block", marginTop: 8 }}>
                  Utiliza el menú superior para navegar entre los módulos y gestionar tus operaciones.
                </span>
              </Text>

              <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid #f5f5f5" }}>
                <Text strong style={{ color: "#8c8c8c", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                  Sistema de emprendimiento 
                </Text>
              </div>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Home;