import { useState, useEffect } from "react";
import { MapaSucursales } from "./MapaSucursales";
import "./Explorar.css";
import { useAdmin } from "../../../AdminContext";

export const ExplorarSucursales = () => {
  const { isAdmin } = useAdmin();
  const [restaurantes, setRestaurantes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Modal Crear/Editar
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "", direccion: "", activo: true,
    categoria: "", telefono: "", descripcion: "",
    lat: "", lng: ""
  });

  // 🆕 Modal Reseñas
  const [showModalResenas, setShowModalResenas] = useState(false);
  const [resenas, setResenas] = useState([]);
  const [loadingResenas, setLoadingResenas] = useState(false);
  const [restauranteSeleccionado, setRestauranteSeleccionado] = useState(null);

  // 🆕 Modal Categorías
  const [showModalCategorias, setShowModalCategorias] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  useEffect(() => {
    fetchRestaurantes();
  }, []);

  const showToast = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(null), 3000);
  };

  const fetchRestaurantes = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/restaurantes/");
      const data = await response.json();
      setRestaurantes(data);
    } catch (err) {
      showToast("Error cargando sucursales");
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
      showToast("Error al buscar sucursales cercanas.");
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Cargar reseñas de un restaurante
  const abrirResenas = async (r) => {
    setRestauranteSeleccionado(r);
    setShowModalResenas(true);
    setLoadingResenas(true);
    try {
      const res = await fetch(`http://localhost:8000/restaurantes/${r.id || r._id}/resenas`);
      const data = await res.json();
      setResenas(data);
    } catch (err) {
      showToast("Error al cargar reseñas");
    } finally {
      setLoadingResenas(false);
    }
  };

  // 🆕 Cargar categorías distintas
  const abrirCategorias = async () => {
    setShowModalCategorias(true);
    setLoadingCategorias(true);
    try {
      const res = await fetch("http://localhost:8000/restaurantes/categorias/distintas");
      const data = await res.json();
      setCategorias(data.categorias);
    } catch (err) {
      showToast("Error al cargar categorías");
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que quieres desactivar esta sucursal?")) return;
    try {
      const res = await fetch(`http://localhost:8000/restaurantes/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Sucursal eliminada (Soft Delete)");
        fetchRestaurantes();
      }
    } catch (err) {
      showToast("Error al eliminar");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      nombre: formData.nombre,
      direccion: formData.direccion,
      activo: formData.activo,
      categoria: formData.categoria.split(",").map(c => c.trim()),
      telefono: formData.telefono,
      descripcion: formData.descripcion,
      ubicacion: {
        type: "Point",
        coordinates: [parseFloat(formData.lng), parseFloat(formData.lat)]
      }
    };

    const url = editandoId
      ? `http://localhost:8000/restaurantes/${editandoId}`
      : "http://localhost:8000/restaurantes/";

    try {
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(editandoId ? "Editado con éxito" : "Creado con éxito");
        setShowModal(false);
        setEditandoId(null);
        fetchRestaurantes();
      }
    } catch (err) {
      showToast("Error al guardar datos");
    }
  };

  const abrirEditar = (r) => {
    setEditandoId(r.id);
    setFormData({
      nombre: r.nombre, direccion: r.direccion, activo: r.activo,
      categoria: r.categoria.join(", "), telefono: r.telefono || "",
      descripcion: r.descripcion || "",
      lat: r.ubicacion.coordinates[1], lng: r.ubicacion.coordinates[0]
    });
    setShowModal(true);
  };

  const restaurantesFiltrados = restaurantes.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.direccion.toLowerCase().includes(busqueda.toLowerCase())
  );

  // 🆕 Helper: estrellitas según calificación
  const renderEstrellas = (cal) => "⭐".repeat(Math.round(cal)) + ` (${cal})`;

  return (
    <div className="explorar-layout">
      {mensaje && <div className="toast-notificacion">{mensaje}</div>}

      <aside className="panel-lateral">
        <div className="panel-header">
          <h2>Nuestras Sucursales</h2>

          <input
            type="text"
            placeholder="Buscar por nombre o ciudad..."
            className="buscador-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <div className="AAA">
            <button onClick={fetchRestaurantes} className="btn-reset-mapa">
              Reestablecer todas las sedes
            </button>

            {/* 🆕 Botón Categorías generales */}
            <button onClick={abrirCategorias} className="btn-reset-mapa">
              Ver Categorías
            </button>

            {isAdmin && (
              <button className="btn-reset-mapa" onClick={() => {
                setEditandoId(null);
                setFormData({ nombre: "", direccion: "", activo: true, categoria: "", telefono: "", descripcion: "", lat: "", lng: "" });
                setShowModal(true);
              }}>
                ➕ Nueva Sucursal
              </button>
            )}
          </div>
        </div>

        <div className="lista-scrollable">
          {loading ? (
            <p className="status-msg">Cargando base de datos...</p>
          ) : restaurantesFiltrados.length > 0 ? (
            restaurantesFiltrados.map((r) => (
              <div key={r.id || r._id} className={`card-sucursal-mini ${!r.activo ? "inactivo" : ""}`}>
                <div className="card-info">
                  <h4>{r.nombre} {!r.activo && "(Inactivo)"}</h4>
                  <p>📍 {r.direccion}</p>
                  <p>{r.telefono}</p>
                  {r.distancia && <small>A {(r.distancia / 1000).toFixed(1)} km</small>}

                  {isAdmin && (
                    <div className="admin-actions">
                      <button onClick={() => abrirEditar(r)} className="btn-edit">✏️</button>
                      <button onClick={() => handleEliminar(r.id)} className="btn-delete">🗑️</button>
                      {/* 🆕 Ahora abre el modal de reseñas */}
                      <button onClick={() => abrirResenas(r)} className="btn-reviews">💬</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="status-msg">No se encontraron resultados.</p>
          )}
        </div>
      </aside>

      <section className="mapa-principal">
        <MapaSucursales
          sucursales={restaurantesFiltrados}
          alHacerClickEnMapa={buscarCercanosAlClick}
        />
      </section>

      {/* ─── MODAL CREAR / EDITAR ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <form className="modal-content resena-card-dashed" onSubmit={handleSubmit}>
            <h3>{editandoId ? "Editar Sede" : "Nueva Sede Italiana"}</h3>
            <input required placeholder="Nombre" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            <input required placeholder="Dirección" value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} />
            <input placeholder="Categorías (separadas por coma)" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
            <div className="grid-inputs">
              <input required type="number" step="any" placeholder="Latitud" value={formData.lat} onChange={e => setFormData({...formData, lat: e.target.value})} />
              <input required type="number" step="any" placeholder="Longitud" value={formData.lng} onChange={e => setFormData({...formData, lng: e.target.value})} />
            </div>
            <input placeholder="Teléfono" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
            <textarea placeholder="Descripción" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
            <div className="modal-buttons">
              <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-confirmar">Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL RESEÑAS ────────────────────────────────────────── */}
      {showModalResenas && (
        <div className="modal-overlay" onClick={() => setShowModalResenas(false)}>
          <div className="modal-content resena-card-dashed" onClick={e => e.stopPropagation()}>
            <h3>💬 Reseñas — {restauranteSeleccionado?.nombre}</h3>

            {loadingResenas ? (
              <p className="status-msg">Cargando reseñas...</p>
            ) : resenas.length > 0 ? (
              <div className="lista-resenas-modal">
                {resenas.map((res) => (
                  <div key={res.id} className="resena-item">
                    <div className="resena-header">
                      <span className="resena-estrellas">{renderEstrellas(res.calificacion)}</span>
                      <span className="resena-fecha">
                        {new Date(res.fecha).toLocaleDateString("es-ES", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </span>
                    </div>
                    {res.comentario && <p className="resena-comentario">"{res.comentario}"</p>}
                    <small className="resena-usuario">Usuario: {res.usuarioId}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="status-msg">Esta sucursal aún no tiene reseñas.</p>
            )}

            <div className="modal-buttons">
              <button type="button" onClick={() => setShowModalResenas(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL CATEGORÍAS ─────────────────────────────────────── */}
      {showModalCategorias && (
        <div className="modal-overlay" onClick={() => setShowModalCategorias(false)}>
          <div className="modal-content resena-card-dashed" onClick={e => e.stopPropagation()}>
            <h3>🏷️ Categorías disponibles</h3>

            {loadingCategorias ? (
              <p className="status-msg">Cargando categorías...</p>
            ) : categorias.length > 0 ? (
              <>
                <p className="status-msg">{categorias.length} categorías en total</p>
                <div className="tags-categoria categorias-grid">
                  {categorias.map((cat) => (
                    <span key={cat} className="tag tag-grande">{cat}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="status-msg">No hay categorías registradas.</p>
            )}

            <div className="modal-buttons">
              <button type="button" onClick={() => setShowModalCategorias(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};