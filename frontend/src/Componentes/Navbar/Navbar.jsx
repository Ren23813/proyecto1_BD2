import { useState } from "react";
import "./Navbar.css";

export const Navbar = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <nav className="navbar">
      
    
      <div className="navbar-top">
        <h1 className="navbar-title">Ristorante Italiano</h1>

        <button
          className="mode-button"
          onClick={() => setIsAdmin(!isAdmin)}
        >
          {isAdmin ? "Vista Usuario" : "Vista Admin"}
        </button>
      </div>

      {/* 🔽 Parte inferior */}
      <div className="navbar-bottom">
        <a href="#inicio">Inicio</a>
        <a href="#sucursales">Sucursales</a>
       
        <a href="#menu">Menú</a>
        <a href="#">Reseñas</a>
        <a href="#">Pedidos</a>
      </div>

    </nav>
  );
};