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

// Componente para agrupar la página principal
const LandingPage = () => (
  <>
    <Inicio />
    <Sucursales />
    <Menu />
  </>
);

function App() {
  

  return (
    <>
      <Router>
        <main className="fondoa">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/explorar" element={<ExplorarSucursales />} />
            <Route path='/carta-completa' element={<CartaCompleta></CartaCompleta>} />
          </Routes>
        </main>
      </Router>
    </>
  )
}

export default App
