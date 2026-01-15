import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'
import { ApiProvider } from '../src/context/ApiContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApiProvider>
        <HashRouter>
          <App />
        </HashRouter>
    </ApiProvider>
  </StrictMode>
)
