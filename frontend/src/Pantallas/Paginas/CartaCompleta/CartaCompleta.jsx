import { useState, useEffect } from "react";
import "./CartaCompleta.css";

export const CartaCompleta = () => {
  const [platillos, setPlatillos] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroRestaurante, setFiltroRestaurante] = useState("");

  useEffect(() => {
    // Cargar datos iniciales
    const cargarDatos = async () => {
      try {
        const [resPlatillos, resRestaurantes] = await Promise.all([
          fetch("http://localhost:8000/articulosMenu/"),
          fetch("http://localhost:8000/restaurantes/")
        ]);
        
        const dataPlatillos = await resPlatillos.json();
        const dataRestaurantes = await resRestaurantes.json();
        
        setPlatillos(dataPlatillos);
        setRestaurantes(dataRestaurantes);
      } catch (error) {
        console.error("Error al conectar con la base de datos:", error);
      }
    };
    cargarDatos();
  }, []);

  // Función para obtener el nombre del restaurante según el ID
  const obtenerNombreRestaurante = (id) => {
    const r = restaurantes.find(res => res.id === id);
    return r ? r.nombre : "Sede Global";
  };

  // LÓGICA DE FILTRADO
  const platillosFiltrados = platillos.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    
    // Si el usuario escribió un restaurante, buscamos el ID de ese restaurante
    const restSeleccionado = restaurantes.find(r => r.nombre === filtroRestaurante);
    const coincideRestaurante = filtroRestaurante === "" || p.restauranteId === restSeleccionado?.id;

    return coincideNombre && coincideRestaurante;
  });

  return (
    <div className="carta-container">
      <header className="carta-header">
        <h1 className="carta-titulo">Nuestra Carta Completa</h1>
        
        <div className="buscadores-group">
          {/* BUSCADOR 1: Select/Input para Restaurante */}
          <div className="buscador-wrapper">
            <label>Filtrar por Sede:</label>
            <input 
              list="restaurantes-list" 
              placeholder="Escribe una sede..."
              value={filtroRestaurante}
              onChange={(e) => setFiltroRestaurante(e.target.value)}
              className="input-busqueda"
            />
            <datalist id="restaurantes-list">
              {restaurantes.map(r => (
                <option key={r.id} value={r.nombre} />
              ))}
            </datalist>
          </div>

          {/* BUSCADOR 2: Texto para Platillo */}
          <div className="buscador-wrapper">
            <label>Buscar Platillo:</label>
            <input 
              type="text" 
              placeholder="Ej: Pizza, Pasta..."
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              className="input-busqueda"
            />
          </div>
        </div>
      </header>

      <div className="tabla-container">
        <table className="tabla-platillos">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Sede</th>
              <th>Descripción</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {platillosFiltrados.map((p) => (
              <tr key={p.id}>
                <td>
                  <img 
                    src={`https://loremflickr.com/100/100/food,italian?lock=${p.id.length}`} 
                    alt={p.nombre} 
                    className="img-tabla"
                  />
                </td>
                <td className="bold">{p.nombre}</td>
                <td><span className="badge-sede">{obtenerNombreRestaurante(p.restauranteId)}</span></td>
                <td className="desc-text">{p.descripcion}</td>
                <td>{p.categoria}</td>
                <td className="precio-text">${p.precio.toFixed(2)}</td>
                <td>
                  <span className={p.disponible ? "status-ok" : "status-no"}>
                    {p.disponible ? "Disponible" : "Agotado"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {platillosFiltrados.length === 0 && (
          <p className="no-results">No se encontraron platillos con esos filtros.</p>
        )}
      </div>
    </div>
  );
};