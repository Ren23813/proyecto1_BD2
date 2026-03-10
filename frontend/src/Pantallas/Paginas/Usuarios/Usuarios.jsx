
import { useState, useEffect, useCallback } from "react";
import "./Usuarios.css";

const PAGE_SIZE = 50;

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeTipo, setMensajeTipo] = useState("ok");

  // Stats
  const [totalItems, setTotalItems] = useState(0);
  const [totalActivos, setTotalActivos] = useState(0);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");

  const busquedaDebounced = useDebounce(busqueda, 400);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Modal editar
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: "", email: "", roles: "", activo: true, nit: ""
  });

  // Modal detalle
  const [showDetalle, setShowDetalle] = useState(false);
  const [usuarioDetalle, setUsuarioDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (texto, tipo = "ok") => {
    setMensaje(texto);
    setMensajeTipo(tipo);
    setTimeout(() => setMensaje(null), 3500);
  };

  // ── Fetch paginado ─────────────────────────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagina, page_size: PAGE_SIZE });
      if (busquedaDebounced) params.set("q", busquedaDebounced);
      if (filtroRol)         params.set("rol", filtroRol);
      if (filtroActivo !== "") params.set("activo", filtroActivo === "activo");

      const res = await fetch(`http://localhost:8000/usuarios/?${params}`);
      const data = await res.json();

      // Soporte para respuesta plana (fallback) y paginada
      if (Array.isArray(data)) {
        setUsuarios(data);
        setTotalItems(data.length);
        setTotalActivos(data.filter(u => u.activo).length);
      } else {
        setUsuarios(data.items ?? []);
        setTotalItems(data.total ?? 0);
        setTotalActivos(data.activos ?? 0);
      }
    } catch {
      showToast("Error cargando usuarios", "error");
    } finally {
      setLoading(false);
    }
  }, [pagina, busquedaDebounced, filtroRol, filtroActivo]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  // Volver a página 1 cuando cambia un filtro
  useEffect(() => { setPagina(1); }, [busquedaDebounced, filtroRol, filtroActivo]);

  // ── Roles únicos (solo de la página actual, suficiente para el selector) ──
  const rolesUnicos = [...new Set(usuarios.flatMap(u => u.roles))];

  // ── Acciones ───────────────────────────────────────────────────────────────
  const abrirEditar = (u) => {
    setEditandoId(u.id);
    setFormData({
      nombre: u.nombre,
      email: u.email,
      roles: u.roles.join(", "),
      activo: u.activo,
      nit: u.nit || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      nombre: formData.nombre,
      email: formData.email,
      roles: formData.roles.split(",").map(r => r.trim()).filter(Boolean),
      activo: formData.activo,
      nit: formData.nit ? parseInt(formData.nit) : null
    };
    try {
      const res = await fetch(`http://localhost:8000/usuarios/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast("✅ Usuario actualizado");
        setShowModal(false);
        fetchUsuarios();
      } else {
        showToast("Error al actualizar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleDesactivar = async (id) => {
    if (!window.confirm("¿Desactivar este usuario?")) return;
    try {
      const res = await fetch(`http://localhost:8000/usuarios/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("🔒 Usuario desactivado");
        fetchUsuarios();
      } else {
        showToast("Error al desactivar", "error");
      }
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const abrirDetalle = async (id) => {
    setShowDetalle(true);
    setLoadingDetalle(true);
    setUsuarioDetalle(null);
    try {
      const res = await fetch(`http://localhost:8000/usuarios/${id}`);
      setUsuarioDetalle(await res.json());
    } catch {
      showToast("Error cargando detalle", "error");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const getRolClass = (rol) => {
    if (rol === "admin")   return "badge-rol admin";
    if (rol === "cliente") return "badge-rol cliente";
    return "badge-rol otro";
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="usuarios-page">
      {mensaje && (
        <div className={`toast-usuarios ${mensajeTipo === "error" ? "toast-error" : ""}`}>
          {mensaje}
        </div>
      )}

      {/* Header */}
      <div className="usuarios-header">
        <div className="usuarios-titulo-bloque">
          <h1>Gestión de Usuarios</h1>
          <p className="usuarios-subtitulo">
            {totalItems} usuario{totalItems !== 1 ? "s" : ""} en total
            <span className="dot-activos"> · <strong>{totalActivos}</strong> activos</span>
          </p>
        </div>

        <div className="usuarios-stats">
          <div className="stat-chip">
            <span className="stat-num">{totalItems}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-chip activo">
            <span className="stat-num">{totalActivos}</span>
            <span className="stat-label">Activos</span>
          </div>
          <div className="stat-chip inactivo">
            <span className="stat-num">{totalItems - totalActivos}</span>
            <span className="stat-label">Inactivos</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="usuarios-filtros">
        <div className="filtro-grupo-u">
          <label>Buscar</label>
          <input
            type="text" placeholder="Nombre o email..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-filtro-u"
          />
        </div>

        <div className="filtro-grupo-u">
          <label>Rol</label>
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} className="select-filtro-u">
            <option value="">Todos los roles</option>
            {rolesUnicos.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo-u">
          <label>Estado</label>
          <select value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)} className="select-filtro-u">
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <button className="btn-reset-u" onClick={() => {
          setBusqueda(""); setFiltroRol(""); setFiltroActivo(""); setPagina(1);
        }}>↺ Limpiar</button>
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="usuarios-status">Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p className="usuarios-status">No se encontraron usuarios con esos filtros.</p>
      ) : (
        <>
          <div className="tabla-usuarios-container">
            <table className="tabla-usuarios">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>NIT</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={!u.activo ? "fila-inactiva" : ""}
                    style={{ animationDelay: `${idx * 0.03}s` }}
                  >
                    <td>
                      <div className="usuario-nombre-celda">
                        <div className="avatar-usuario">{u.nombre.charAt(0).toUpperCase()}</div>
                        <span className="nombre-bold">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="email-cell">{u.email}</td>
                    <td>
                      <div className="roles-wrap">
                        {u.roles.map(r => (
                          <span key={r} className={getRolClass(r)}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="nit-cell">{u.nit ?? <span className="sin-dato">—</span>}</td>
                    <td className="fecha-cell">
                      {u.fechaRegistro
                        ? new Date(u.fechaRegistro).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                        : <span className="sin-dato">—</span>}
                    </td>
                    <td>
                      <span className={u.activo ? "status-activo" : "status-inactivo"}>
                        {u.activo ? "● Activo" : "● Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-usuario">
                        <button onClick={() => abrirDetalle(u.id)} className="btn-detalle-u" title="Ver detalle">👁️</button>
                        <button onClick={() => abrirEditar(u)} className="btn-edit-u" title="Editar">✏️</button>
                        {u.activo && (
                          <button onClick={() => handleDesactivar(u.id)} className="btn-delete-u" title="Desactivar">🔒</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="ing-paginacion">
            <button
              className="btn-pag"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >‹ Anterior</button>

            <span className="pag-info">
              Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
              &nbsp;·&nbsp;{totalItems} registros
            </span>

            <button
              className="btn-pag"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >Siguiente ›</button>
          </div>
        </>
      )}

      {/* MODAL EDITAR */}
      {showModal && (
        <div className="modal-overlay-u" onClick={() => setShowModal(false)}>
          <form className="modal-u" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar Usuario</h3>
            <div className="modal-u-grid">
              <div className="field-u full">
                <label>Nombre</label>
                <input required placeholder="Nombre completo" value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
              </div>
              <div className="field-u full">
                <label>Email</label>
                <input required type="email" placeholder="correo@ejemplo.com" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="field-u">
                <label>Roles (separados por coma)</label>
                <input placeholder="admin, cliente..." value={formData.roles}
                  onChange={e => setFormData({ ...formData, roles: e.target.value })} />
              </div>
              <div className="field-u">
                <label>NIT (opcional)</label>
                <input type="number" placeholder="12345678" value={formData.nit}
                  onChange={e => setFormData({ ...formData, nit: e.target.value })} />
              </div>
              <div className="field-u activo-toggle">
                <label>
                  <input type="checkbox" checked={formData.activo}
                    onChange={e => setFormData({ ...formData, activo: e.target.checked })} />
                  Usuario activo
                </label>
              </div>
            </div>
            <div className="modal-u-buttons">
              <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-confirmar-u">Guardar Cambios</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETALLE */}
      {showDetalle && (
        <div className="modal-overlay-u" onClick={() => setShowDetalle(false)}>
          <div className="modal-u modal-detalle" onClick={e => e.stopPropagation()}>
            <h3>👤 Detalle de Usuario</h3>
            {loadingDetalle ? (
              <p className="usuarios-status">Cargando...</p>
            ) : usuarioDetalle ? (
              <div className="detalle-contenido">
                <div className="detalle-avatar">
                  {usuarioDetalle.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="detalle-grid">
                  {[
                    ["ID", <span className="mono">{usuarioDetalle.id}</span>],
                    ["Nombre", usuarioDetalle.nombre],
                    ["Email", usuarioDetalle.email],
                    ["Roles", (
                      <div className="roles-wrap">
                        {usuarioDetalle.roles.map(r => (
                          <span key={r} className={getRolClass(r)}>{r}</span>
                        ))}
                      </div>
                    )],
                    ["NIT", usuarioDetalle.nit ?? "—"],
                    ["Registro", usuarioDetalle.fechaRegistro
                      ? new Date(usuarioDetalle.fechaRegistro).toLocaleString("es-ES")
                      : "—"],
                    ["Estado", (
                      <span className={usuarioDetalle.activo ? "status-activo" : "status-inactivo"}>
                        {usuarioDetalle.activo ? "● Activo" : "● Inactivo"}
                      </span>
                    )],
                  ].map(([key, val]) => (
                    <div key={key} className="detalle-fila">
                      <span className="detalle-key">{key}</span>
                      <span className="detalle-val">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="usuarios-status">No se pudo cargar el usuario.</p>
            )}
            <div className="modal-u-buttons">
              <button type="button" onClick={() => setShowDetalle(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
