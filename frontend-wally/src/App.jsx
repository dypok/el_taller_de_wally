import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Servicios from './pages/Servicios';
import Inventario from './pages/Inventario';
import Finanzas from './pages/Finanzas';
import Clientes from './pages/Clientes';

// --- EL GUARDIÁN DE RUTAS ---
// Si hay token, te deja pasar. Si no, te devuelve al login.
const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirección inteligente en la ruta base ("/") */}
        <Route path="/" element={
          localStorage.getItem('token') ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />

        {/* Ruta Pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas */}
        <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
        <Route path="/servicios" element={<RutaProtegida><Servicios /></RutaProtegida>} />
        <Route path="/inventario" element={<RutaProtegida><Inventario /></RutaProtegida>} />
        <Route path="/finanzas" element={<RutaProtegida><Finanzas /></RutaProtegida>} />
        <Route path="/clientes" element={<RutaProtegida><Clientes /></RutaProtegida>} />

        {/* Cualquier ruta que no exista, manda al Dashboard (o al login si no hay sesión) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}