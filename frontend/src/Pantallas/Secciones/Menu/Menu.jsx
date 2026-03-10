import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Menu.css";
import { MenuItem } from "../../../Componentes/MenuItem/MenuItem";

const generarSemillaMenu = (id) => {
  if (!id) return 1;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const Menu = () => {
  const [menuData, setMenuData] = useState([]);
  const [paginaActual, setPaginaActual] = useState(0);
  const itemsPorPagina = 8;
  const navigate = useNavigate();

  // 1. Cargar datos desde tu API de FastAPI
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch("http://localhost:8000/articulosMenu/");
        const data = await response.json();
        // Solo mostrar los que están disponibles
        setMenuData(data.filter(item => item.disponible));
      } catch (error) {
        console.error("Error cargando el menú:", error);
      }
    };
    fetchMenu();
  }, []);

  const totalPaginas = Math.ceil(menuData.length / itemsPorPagina);

  // 2. Efecto para el carrusel automático
  useEffect(() => {
    if (totalPaginas <= 1) return;

    const intervalo = setInterval(() => {
      setPaginaActual((prev) => (prev === totalPaginas - 1 ? 0 : prev + 1));
    }, 6000); // 4 segundos para que dé tiempo a leer

    return () => clearInterval(intervalo);
  }, [totalPaginas]);

  const inicio = paginaActual * itemsPorPagina;
  const itemsVisibles = menuData.slice(inicio, inicio + itemsPorPagina);

  return (
    <section id="menu" className="menu-section">
      <h1 className="section-title">Nuestro Menú</h1>

      <div className="menu-grid">
        {itemsVisibles.length > 0 ? (
          itemsVisibles.map((item) => {
            const semilla = generarSemillaMenu(item.id);
            return (
              <MenuItem 
                key={item.id} 
                nombre={item.nombre}
                descripcion={item.descripcion}
                precio={item.precio}
                /* Imagen aleatoria pero fija por ID de plato */
                imagen={item.imagen || "https://via.placeholder.com/400x250?text=Platillo"}
              />
            );
          })
        ) : (
          <p>Cargando delicias...</p>
        )}
      </div>

      {/* Botón único para ver el menú completo */}
      <div className="menu-footer">
        <button 
          className="inicio-boton" 
          onClick={() => navigate("/carta-completa")}
        >
          Ver Menú Completo
        </button>
      </div>
    </section>
  );
};