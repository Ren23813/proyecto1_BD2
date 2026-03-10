import { useState, useEffect } from "react";
import "./CartaCompleta.css";
import { useAdmin } from "../../../AdminContext";

export const CartaCompleta = () => {
  const { isAdmin } = useAdmin();
  const [platillos, setPlatillos] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroRestaurante, setFiltroRestaurante] = useState("");
  const [mensaje, setMensaje] = useState(null);

  // Modal Editar
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "", descripcion: "", precio: "",
    categoria: "", disponible: true, imagen: ""
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const showToast = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 3000);
  };

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
      showToast("Error al conectar con la base de datos");
    }
  };

  const obtenerNombreRestaurante = (id) => {
    const r = restaurantes.find(res => res.id === id);
    return r ? r.nombre : "Sede Global";
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Desactivar este platillo?")) return;
    try {
      const res = await fetch(`http://localhost:8000/articulosMenu/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("🗑️ Platillo desactivado");
        cargarDatos();
      }
    } catch {
      showToast("Error al eliminar");
    }
  };

  const abrirEditar = (p) => {
    setEditandoId(p.id);
    setFormData({
      nombre: p.nombre,
      descripcion: p.descripcion || "",
      precio: p.precio,
      categoria: p.categoria,
      disponible: p.disponible,
      imagen: p.imagen || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      ...formData,
      precio: parseFloat(formData.precio)
    };
    try {
      const res = await fetch(`http://localhost:8000/articulosMenu/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast("✅ Platillo actualizado");
        setShowModal(false);
        setEditandoId(null);
        cargarDatos();
      }
    } catch {
      showToast("Error al guardar");
    }
  };

  const platillosFiltrados = platillos.filter((p) => {
    const coincideNombre = p.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    const restSeleccionado = restaurantes.find(r => r.nombre === filtroRestaurante);
    const coincideRestaurante = filtroRestaurante === "" || p.restauranteId === restSeleccionado?.id;
    return coincideNombre && coincideRestaurante;
  });

  return (
    <div className="carta-container">
      {mensaje && <div className="toast-notificacion">{mensaje}</div>}

      <header className="carta-header">
        <h1 className="carta-titulo">Nuestra Carta</h1>

        <div className="buscadores-group">
          <div className="buscador-wrapper">
            <label>Filtrar por Sede</label>
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

          <div className="buscador-wrapper">
            <label>Buscar Platillo</label>
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
              {isAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {platillosFiltrados.map((p) => (
              <tr key={p.id} className={!p.disponible ? "fila-inactiva" : ""}>
                <td>
                  <img
                    src={p.imagen || `https://placehold.co/60x60?text=${encodeURIComponent(p.nombre[0])}`}
                    alt={p.nombre}
                    className="img-tabla"
                    onError={(e) => { e.target.src = `https://placehold.co/60x60?text=${encodeURIComponent(p.nombre[0])}`; }}
                  />
                </td>
                <td className="bold">{p.nombre}</td>
                <td><span className="badge-sede">{obtenerNombreRestaurante(p.restauranteId)}</span></td>
                <td className="desc-text">{p.descripcion}</td>
                <td><span className="badge-categoria">{p.categoria}</span></td>
                <td className="precio-text">${p.precio.toFixed(2)}</td>
                <td>
                  <span className={p.disponible ? "status-ok" : "status-no"}>
                    {p.disponible ? "● Disponible" : "● Agotado"}
                  </span>
                </td>
                {isAdmin && (
                  <td>
                    <div className="admin-actions-carta">
                      <button onClick={() => abrirEditar(p)} className="btn-edit-carta">✏️ Editar</button>
                      <button onClick={() => handleEliminar(p.id)} className="btn-delete-carta">🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {platillosFiltrados.length === 0 && (
          <p className="no-results">No se encontraron platillos con esos filtros.</p>
        )}
      </div>

      {/* ─── MODAL EDITAR PLATILLO ─────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal-content modal-carta" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar Platillo</h3>

            <div className="modal-carta-grid">
              <div className="field-group full-width">
                <label>Nombre</label>
                <input required placeholder="Nombre del platillo" value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})} />
              </div>

              <div className="field-group full-width">
                <label>Descripción</label>
                <textarea placeholder="Descripción..." value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>

              <div className="field-group">
                <label>Precio ($)</label>
                <input required type="number" step="0.01" min="0" placeholder="0.00"
                  value={formData.precio}
                  onChange={e => setFormData({...formData, precio: e.target.value})} />
              </div>

              <div className="field-group">
                <label>Categoría</label>
                <input placeholder="Antipasto, Pizza..." value={formData.categoria}
                  onChange={e => setFormData({...formData, categoria: e.target.value})} />
              </div>

              <div className="field-group full-width">
                <label>URL de Imagen</label>
                <input placeholder="https://..." value={formData.imagen}
                  onChange={e => setFormData({...formData, imagen: e.target.value})} />
              </div>

              {/* Preview imagen */}
              {formData.imagen && (
                <div className="field-group full-width imagen-preview">
                  <img src={formData.imagen} alt="preview"
                    onError={e => e.target.style.display = "none"} />
                </div>
              )}

              <div className="field-group disponible-toggle">
                <label>
                  <input type="checkbox" checked={formData.disponible}
                    onChange={e => setFormData({...formData, disponible: e.target.checked})} />
                  Disponible
                </label>
              </div>
            </div>

            <div className="modal-buttons">
              <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-confirmar">Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};