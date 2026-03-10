import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Inicio } from './Pantallas/Secciones/Inicio/Inicio'
import { Navbar } from './Componentes/Navbar/Navbar'
import { Sucursales } from './Pantallas/Secciones/Sucursales/Sucursales'
import { Menu } from './Pantallas/Secciones/Menu/Menu'
import { ExplorarSucursales } from './Pantallas/Paginas/MapaSucursal/ExplorarSucursales'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartaCompleta } from './Pantallas/Paginas/CartaCompleta/CartaCompleta'
import { NuevoPedido } from './Pantallas/Paginas/NuevoPedido/NuevoPedido'
import { PedidosHome } from './Pantallas/Paginas/PedidosHome/PedidosHome'
import { Resenas } from './Pantallas/Secciones/Resenas/Resenas'
import { Dashboard } from './Pantallas/Secciones/dashboard/Dashboard'
import { AdminProvider } from './AdminContext'
import { PaginaResenas } from './Pantallas/Paginas/TodasResenas/PaginaResena'
import { Usuarios } from './Pantallas/Paginas/Usuarios/Usuarios'
import { Ingredientes } from './Pantallas/Paginas/Ingredientes/Ingredientes'
import { RegistroOrdenes } from './Pantallas/Paginas/RegistroOrdenes/RegistroOrdenes'

// Componente para agrupar la página principal
const LandingPage = () => (
  <>
    <Inicio />
    <Sucursales />
    <Menu />
    <Resenas></Resenas>
    
  </>
);

function App() {
  

  return (
    <>
      <AdminProvider>
      <Router>
        <main className="fondoa">
          <Navbar />
          <Routes>
            
            <Route path="/" element={<LandingPage />} />
            <Route path="/explorar" element={<ExplorarSucursales />} />
            <Route path='/carta-completa' element={<CartaCompleta></CartaCompleta>} />
            <Route path="/pedidos/nuevo" element={<NuevoPedido></NuevoPedido>}/>
            <Route path="/pedidos" element={<PedidosHome></PedidosHome>}/>
            <Route path="/pedidos/rastrear" element={<RegistroOrdenes></RegistroOrdenes>}/>
            
            <Route path="/resena-completas" element={<PaginaResenas></PaginaResenas>}/>
            <Route path="/clientes" element={<Usuarios></Usuarios>}/>
            <Route path="/inventario" element={<Ingredientes></Ingredientes>}/>


            
          </Routes>
        </main>
      </Router>
      </AdminProvider>
    </>
  )
}

export default App
