import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Inicio } from './Pantallas/Secciones/Inicio/Inicio'
import { Navbar } from './Componentes/Navbar/Navbar'
import { Sucursales } from './Pantallas/Secciones/Sucursales/Sucursales'
import { Menu } from './Pantallas/Secciones/Menu/Menu'

function App() {
  

  return (
    <>
      <main className="fondoa">
        <Navbar></Navbar>
        <Inicio></Inicio>
        <Sucursales></Sucursales>
        <Menu></Menu>
      </main>
    </>
  )
}

export default App
