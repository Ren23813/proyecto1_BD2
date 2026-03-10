import { useState, useEffect } from "react";
import "./PaginaResena.css";
import { useAdmin } from "../../../AdminContext";

export const PaginaResenas = () => {
  const { isAdmin } = useAdmin();
  const [resenas, setResenas] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeTipo, setMensajeTipo] = useState("ok");

  // Filtros
  const [filtroRestaurante, setFiltroRestaurante] = useState("");
  const [filtroEstrellas, setFiltroEstrellas] = useState("");
  const [ordenamiento, setOrdenamiento] = useState("recientes");

  // Modal editar
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formEdit, setFormEdit] = useState({ calificacion: 5, comentario: "" });

  // Modal eliminar todas (admin)
  const [showModalBorrarTodas, setShowModalBorrarTodas] = useState(false);
  const [restauranteBorrar, setRestauranteBorrar] = useState("");

  useEffect(() => {
    fetchTodo();
  }, []);

  const showToast = (texto, tipo = "ok") => {
    setMensaje(texto);
    setMensajeTipo(tipo);
    setTimeout(() => setMensaje(null), 3500);
  };

  const fetchTodo = async () => {
    setLoading(true);
    try {
      const [rRes, rRest] = await Promise.all([
        fetch("http://localhost:8000/resenas/"),
        fetch("http://localhost:8000/restaurantes/")
      ]);
      setResenas(await rRes.json());
      setRestaurantes(await rRest.json());
    } catch {
      showToast("Error cargando datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const getNombreRestaurante = (id) => {
    const r = restaurantes.find(r => r.id === id || r._id === id);
    return r ? r.nombre : "Restaurante desconocido";
  };

  // ── Filtrado y ordenamiento ──────────────────
  const resenasProcesadas = resenas
    .filter(r => {
      const coincideRest = filtroRestaurante === "" || r.restauranteId === filtroRestaurante;
      const coincideEst = filtroEstrellas === "" || r.calificacion === parseInt(filtroEstrellas);
      return coincideRest && coincideEst;
    })
    .sort((a, b) => {
      if (ordenamiento === "recientes")   return new Date(b.fecha) - new Date(a.fecha);
      if (ordenamiento === "antiguas")    return new Date(a.fecha) - new Date(b.fecha);
      if (ordenamiento === "positivas")   return b.calificacion - a.calificacion;
      if (ordenamiento === "negativas")   return a.calificacion - b.calificacion;
      return 0;
    });

  // ── CRUD ─────────────────────────────────────
  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar esta reseña definitivamente?")) return;
    try {
      const res = await fetch(`http://localhost:8000/resenas/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("🗑️ Reseña eliminada");
        fetchTodo();
      } else {
        showToast("Error al eliminar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const abrirEditar = (r) => {
    setEditandoId(r.id);
    setFormEdit({ calificacion: r.calificacion, comentario: r.comentario || "" });
    setShowModalEditar(true);
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/resenas/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calificacion: parseInt(formEdit.calificacion), comentario: formEdit.comentario })
      });
      if (res.ok) {
        showToast("Reseña actualizada");
        setShowModalEditar(false);
        fetchTodo();
      } else {
        showToast("Error al actualizar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleEliminarTodasDeRestaurante = async () => {
    if (!restauranteBorrar) return;
    try {
      const res = await fetch(`http://localhost:8000/resenas/restaurante/${restauranteBorrar}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(` ${data.eliminadas} reseñas eliminadas`);
        setShowModalBorrarTodas(false);
        setRestauranteBorrar("");
        fetchTodo();
      } else {
        showToast("Error al eliminar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const renderEstrellas = (n) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < n ? "estrella on" : "estrella off"}>★</span>
    ));

  const promedioEstrellas = resenasProcesadas.length
    ? (resenasProcesadas.reduce((a, r) => a + r.calificacion, 0) / resenasProcesadas.length).toFixed(1)
    : "—";

  return (
    <div className="resenas-page">
      {/* ── Toast ── */}
      {mensaje && (
        <div className={`toast-resenas ${mensajeTipo === "error" ? "toast-error" : ""}`}>
          {mensaje}
        </div>
      )}

      {/* ── Header ── */}
      <div className="resenas-header">
        <div className="resenas-titulo-bloque">
          <h1>Reseñas</h1>
          <p className="resenas-subtitulo">
            {resenasProcesadas.length} reseña{resenasProcesadas.length !== 1 ? "s" : ""} · Promedio: <strong>{promedioEstrellas} ★</strong>
          </p>
        </div>

        {isAdmin && (
          <button
            className="btn-peligro"
            onClick={() => setShowModalBorrarTodas(true)}
          >
             Eliminar todas de una sede
          </button>
        )}
      </div>

      {/* ── Barra de filtros ── */}
      <div className="resenas-filtros">
        <div className="filtro-grupo">
          <label>Sede</label>
          <select value={filtroRestaurante} onChange={e => setFiltroRestaurante(e.target.value)}>
            <option value="">Todas las sedes</option>
            {restaurantes.map(r => (
              <option key={r.id || r._id} value={r.id || r._id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Estrellas</label>
          <select value={filtroEstrellas} onChange={e => setFiltroEstrellas(e.target.value)}>
            <option value="">Todas</option>
            {[5, 4, 3, 2, 1].map(n => (
              <option key={n} value={n}>{"★".repeat(n)} ({n})</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Ordenar por</label>
          <select value={ordenamiento} onChange={e => setOrdenamiento(e.target.value)}>
            <option value="recientes">Más recientes</option>
            <option value="antiguas">Más antiguas</option>
            <option value="positivas">Mejor calificadas</option>
            <option value="negativas">Peor calificadas</option>
          </select>
        </div>

        <button className="btn-reset-filtros" onClick={() => {
          setFiltroRestaurante(""); setFiltroEstrellas(""); setOrdenamiento("recientes");
        }}>
          ↺ Limpiar filtros
        </button>
      </div>

      {/* ── Grid de reseñas ── */}
      {loading ? (
        <p className="resenas-status">Cargando reseñas...</p>
      ) : resenasProcesadas.length === 0 ? (
        <p className="resenas-status">No hay reseñas con estos filtros.</p>
      ) : (
        <div className="resenas-grid">
          {resenasProcesadas.map((r, idx) => (
            <div
              key={r.id}
              className={`resena-card calificacion-${r.calificacion}`}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {/* Cabecera de la card */}
              <div className="resena-card-header">
                <div className="resena-estrellas-row">
                  {renderEstrellas(r.calificacion)}
                  <span className="resena-num-cal">{r.calificacion}/5</span>
                </div>
                <span className="resena-sede-badge">
                  📍 {getNombreRestaurante(r.restauranteId)}
                </span>
              </div>

              {/* Comentario */}
              <p className="resena-comentario">
                {r.comentario ? `"${r.comentario}"` : <em className="sin-comentario">Sin comentario</em>}
              </p>

              {/* Footer */}
              <div className="resena-card-footer">
                <span className="resena-fecha">
                  {new Date(r.fecha).toLocaleDateString("es-ES", {
                    day: "2-digit", month: "short", year: "numeric"
                  })}
                </span>
                <span className="resena-usuario-id" title={r.usuarioId}>
                  👤 {r.usuarioId.slice(-6)}
                </span>
              </div>

              {/* Acciones admin */}
              {isAdmin && (
                <div className="resena-admin-actions">
                  <button onClick={() => abrirEditar(r)} className="btn-edit-resena">✏️ Editar</button>
                  <button onClick={() => handleEliminar(r.id)} className="btn-delete-resena">🗑️ Eliminar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL EDITAR ── */}
      {showModalEditar && (
        <div className="modal-overlay-resenas" onClick={() => setShowModalEditar(false)}>
          <form className="modal-resenas" onSubmit={handleGuardarEdicion} onClick={e => e.stopPropagation()}>
            <h3> Editar Reseña</h3>

            <div className="field-resena">
              <label>Calificación</label>
              <div className="estrellas-selector">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`estrella-btn ${n <= formEdit.calificacion ? "activa" : ""}`}
                    onClick={() => setFormEdit({ ...formEdit, calificacion: n })}
                  >
                    ★
                  </button>
                ))}
                <span className="cal-label">{formEdit.calificacion}/5</span>
              </div>
            </div>

            <div className="field-resena">
              <label>Comentario</label>
              <textarea
                placeholder="Escribe un comentario..."
                value={formEdit.comentario}
                onChange={e => setFormEdit({ ...formEdit, comentario: e.target.value })}
              />
            </div>

            <div className="modal-resenas-buttons">
              <button type="button" onClick={() => setShowModalEditar(false)}>Cancelar</button>
              <button type="submit" className="btn-confirmar-resena">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL ELIMINAR TODAS DE UNA SEDE (admin) ── */}
      {showModalBorrarTodas && (
        <div className="modal-overlay-resenas" onClick={() => setShowModalBorrarTodas(false)}>
          <div className="modal-resenas modal-peligro" onClick={e => e.stopPropagation()}>
            <h3>Eliminar todas las reseñas de una sede</h3>
            <p className="advertencia-texto">
              Esta acción es <strong>irreversible</strong>. Se eliminarán permanentemente
              todas las reseñas del restaurante seleccionado.
            </p>

            <div className="field-resena">
              <label>Selecciona la sede</label>
              <select value={restauranteBorrar} onChange={e => setRestauranteBorrar(e.target.value)}>
                <option value="">— Elige un restaurante —</option>
                {restaurantes.map(r => (
                  <option key={r.id || r._id} value={r.id || r._id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            {restauranteBorrar && (
              <div className="confirmacion-sede">
                <span>⚠️ Se eliminarán <strong>
                  {resenas.filter(r => r.restauranteId === restauranteBorrar).length}
                </strong> reseña(s) de <strong>{getNombreRestaurante(restauranteBorrar)}</strong></span>
              </div>
            )}

            <div className="modal-resenas-buttons">
              <button type="button" onClick={() => setShowModalBorrarTodas(false)}>Cancelar</button>
              <button
                type="button"
                className="btn-peligro-confirmar"
                disabled={!restauranteBorrar}
                onClick={handleEliminarTodasDeRestaurante}
              >
                Eliminar todas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};