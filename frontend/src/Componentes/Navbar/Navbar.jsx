import { useState } from "react";
import "./Navbar.css";
import { useLocation, useNavigate } from "react-router";
import { useAdmin } from "../../AdminContext";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isAdmin, toggleAdmin } = useAdmin();
 

  const handleScrollTo = (id) => {
    if (location.pathname !== "/") {
      // Si no estamos en la home, navegamos primero a la home
      navigate("/");
      // Esperamos un momento a que el DOM cargue la sección
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      // Si ya estamos en la home, solo hacemos scroll
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="navbar">
      
    
      <div className="navbar-top">
        <h1 className="navbar-title">Ristorante Italiano</h1>

        <button
          className="mode-button"
          onClick={toggleAdmin}
        >
          {isAdmin ? "Vista Usuario" : "Vista Admin"}
        </button>
      </div>

      {/* 🔽 Parte inferior */}
      <div className="navbar-bottom">
        <button className="nav-link-btn" onClick={() => handleScrollTo("inicio")}>Inicio</button>
        <button className="nav-link-btn" onClick={() => handleScrollTo("sucursales")}>Sucursales</button>
        <button className="nav-link-btn" onClick={() => handleScrollTo("menu")}>Menú</button>
        <button className="nav-link-btn" onClick={() => handleScrollTo("resenas")}>Reseñas</button>
        <button className="nav-link-btn" onClick={() => navigate("/pedidos")}>Ordenes</button>

        {isAdmin && (
          <>
            <button className="nav-link-btn admin-link" onClick={() => navigate("/clientes")}>
              Clientes
            </button>
            <button className="nav-link-btn admin-link" onClick={() => navigate("/inventario")}>
              Inventario
            </button>
          </>
        )}
      </div>

    </nav>
  );
};