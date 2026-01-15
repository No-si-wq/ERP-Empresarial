import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'
import { ApiProvider } from '../src/context/ApiContext.jsx'
import { UpdateProvider } from '../src/context/UpdateContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApiProvider>
      <UpdateProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </UpdateProvider>
    </ApiProvider>
  </StrictMode>
)
