import { useState, useEffect } from "react";
import { MapaSucursales } from "./MapaSucursales";
import "./Explorar.css";

export const ExplorarSucursales = () => {
  const [restaurantes, setRestaurantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRestaurantes();
  }, []);

  const fetchRestaurantes = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/restaurantes/");
      const data = await response.json();
      setRestaurantes(data);
    } catch (err) {
      console.error("Error cargando sucursales");
    } finally {
      setLoading(false);
    }
  };

  const buscarCercanosAlClick = async (lat, lng) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/restaurantes/cercanos/?longitud=${lng}&latitud=${lat}&limite=5`
      );
      const data = await response.json();
      setRestaurantes(data);
    } catch (err) {
      alert("Error al buscar sucursales cercanas.");
    } finally {
      setLoading(false);
    }
  };

  // Filtrado en tiempo real por nombre o dirección
  const restaurantesFiltrados = restaurantes.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.direccion.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="explorar-layout">
      {/* 🧭 PANEL IZQUIERDO: Buscador y Lista */}
      <aside className="panel-lateral">
        <div className="panel-header">
          <h2>Nuestras Sedes</h2>
          <input
            type="text"
            placeholder="Buscar por nombre o ciudad..."
            className="buscador-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button onClick={fetchRestaurantes} className="btn-reset-mapa">
            🔄 Ver todos los puntos
          </button>
        </div>

        <div className="lista-scrollable">
          {loading ? (
            <p className="status-msg">Cargando base de datos...</p>
          ) : restaurantesFiltrados.length > 0 ? (
            restaurantesFiltrados.map((r) => (
              <div key={r.id || r._id} className="card-sucursal-mini">
                <img 
                  src={`https://loremflickr.com/150/100/restaurant,italian?lock=${r.id || r._id}`} 
                  alt={r.nombre} 
                />
                <div className="card-info">
                  <h4>{r.nombre}</h4>
                  <p>{r.direccion}</p>
                  {r.distancia && <small>A {(r.distancia / 1000).toFixed(1)} km</small>}
                </div>
              </div>
            ))
          ) : (
            <p className="status-msg">No se encontraron resultados.</p>
          )}
        </div>
      </aside>

      {/* 🗺️ PANEL DERECHO: Mapa */}
      <section className="mapa-principal">
        <MapaSucursales 
          sucursales={restaurantesFiltrados} 
          alHacerClickEnMapa={buscarCercanosAlClick} 
        />
      </section>
    </div>
  );
};