import { useState, useEffect } from "react";
import "./RegistroOrdenes.css";
import { useAdmin } from "../../../AdminContext";

const ESTADOS = ["Pendiente", "En Preparación", "En Camino", "Completada", "Cancelada"];

const ESTADO_COLOR = {
  "Pendiente":       "estado-pendiente",
  "En Preparación":  "estado-preparacion",
  "En Camino":       "estado-camino",
  "Completada":      "estado-completada",
  "Cancelada":       "estado-cancelada",
};

export const RegistroOrdenes = () => {
  const { isAdmin } = useAdmin();

  // Datos
  const [ordenes, setOrdenes] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeTipo, setMensajeTipo] = useState("ok");

  // Vista usuario: búsqueda por NIT
  const [nitBusqueda, setNitBusqueda] = useState("");
  const [nitConfirmado, setNitConfirmado] = useState("");
  const [usuarioNit, setUsuarioNit] = useState(null);

  // Filtros admin
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroRestaurante, setFiltroRestaurante] = useState("");
  const [busquedaId, setBusquedaId] = useState("");

  // Paginación
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 10;

  // Modal detalle
  const [showDetalle, setShowDetalle] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Modal editar (admin)
  const [showEditar, setShowEditar] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formEditar, setFormEditar] = useState({ estado: "", metodoPago: "", tipoOrden: "" });

  useEffect(() => { fetchTodo(); }, [pagina]);

  useEffect(() => {
    if (isAdmin) fetchTodo();
  }, [filtroEstado, filtroRestaurante]);

  const showToast = (texto, tipo = "ok") => {
    setMensaje(texto); setMensajeTipo(tipo);
    setTimeout(() => setMensaje(null), 3500);
  };

  const fetchTodo = async () => {
    setLoading(true);
    try {
      const [rO, rR, rU] = await Promise.all([
        fetch(`http://localhost:8000/ordenes/?skip=${pagina * POR_PAGINA}&limit=${POR_PAGINA}`),
        fetch("http://localhost:8000/restaurantes/"),
        fetch("http://localhost:8000/usuarios/")
      ]);
      setOrdenes(await rO.json());
      setRestaurantes(await rR.json());
      setUsuarios(await rU.json());
    } catch { showToast("Error cargando órdenes", "error"); }
    finally { setLoading(false); }
  };

  const getNombreRestaurante = (id) => {
    const r = restaurantes.find(r => r.id === id || r._id === id);
    return r ? r.nombre : "—";
  };

  const getNombreUsuario = (id) => {
    const u = usuarios.find(u => u.id === id);
    return u ? u.nombre : id?.slice(-6) || "—";
  };

  // ── Vista usuario: buscar por NIT ──────────────
  const buscarPorNit = () => {
    const u = usuarios.find(u => u.nit?.toString() === nitBusqueda);
    if (u) {
      setUsuarioNit(u);
      setNitConfirmado(nitBusqueda);
    } else {
      showToast("NIT no encontrado en el sistema", "error");
      setUsuarioNit(null);
      setNitConfirmado("");
    }
  };

  // Órdenes del usuario buscado (usuario)
  const ordenesDelUsuario = ordenes.filter(o => o.usuarioId === usuarioNit?.id);

  // Órdenes filtradas (admin)
  const ordenesFiltradas = ordenes
    .filter(o => filtroEstado === "" || o.estado === filtroEstado)
    .filter(o => filtroRestaurante === "" || o.restauranteId === filtroRestaurante)
    .filter(o => busquedaId === "" || o.id.includes(busquedaId));

  // ── CRUD admin ─────────────────────────────────
  const abrirDetalle = async (id) => {
    setShowDetalle(true);
    setLoadingDetalle(true);
    setOrdenDetalle(null);
    try {
      const res = await fetch(`http://localhost:8000/ordenes/${id}`);
      setOrdenDetalle(await res.json());
    } catch { showToast("Error cargando detalle", "error"); }
    finally { setLoadingDetalle(false); }
  };

  const abrirEditar = (o) => {
    setEditandoId(o.id);
    setFormEditar({ estado: o.estado || "", metodoPago: o.metodoPago || "", tipoOrden: o.tipoOrden || "" });
    setShowEditar(true);
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    const body = {};
    if (formEditar.estado)     body.estado = formEditar.estado;
    if (formEditar.metodoPago) body.metodoPago = formEditar.metodoPago;
    if (formEditar.tipoOrden)  body.tipoOrden = formEditar.tipoOrden;

    try {
      const res = await fetch(`http://localhost:8000/ordenes/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast("✅ Orden actualizada");
        setShowEditar(false);
        fetchTodo();
      } else showToast("Error al actualizar", "error");
    } catch { showToast("Error de conexión", "error"); }
  };

  const handleCancelar = async (id) => {
    if (!window.confirm("¿Cancelar esta orden?")) return;
    try {
      const res = await fetch(`http://localhost:8000/ordenes/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("🚫 Orden cancelada"); fetchTodo(); }
      else showToast("Error al cancelar", "error");
    } catch { showToast("Error de conexión", "error"); }
  };

  const handleCompletarPendientes = async () => {
    const pendientes = ordenes.filter(o => o.estado === "Pendiente").length;
    if (!window.confirm(`¿Completar ${pendientes} orden(es) pendiente(s)?`)) return;
    try {
      const res = await fetch("http://localhost:8000/ordenes/completar-pendientes", { method: "PUT" });
      const data = await res.json();
      if (res.ok) {
        showToast(`✅ ${data.modificadas} orden(es) completada(s)`);
        fetchTodo();
      } else showToast("Error al completar", "error");
    } catch { showToast("Error de conexión", "error"); }
  };

  const pendientesCount = ordenes.filter(o => o.estado === "Pendiente").length;

  // ── Tabla compartida ───────────────────────────
  const TablaOrdenes = ({ lista, modoUsuario = false }) => (
    <div className="ro-tabla-container">
      <table className="ro-tabla">
        <thead>
          <tr>
            <th>ID</th>
            <th>Sede</th>
            {!modoUsuario && <th>Cliente</th>}
            <th>Total</th>
            <th>Estado</th>
            <th>Pago</th>
            <th>Entrega</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 ? (
            <tr><td colSpan={modoUsuario ? 8 : 9} className="ro-tabla-vacia">No hay órdenes que mostrar.</td></tr>
          ) : lista.map((o, idx) => (
            <tr key={o.id} style={{ animationDelay: `${idx * 0.025}s` }} className={o.estado === "Cancelada" ? "ro-fila-cancelada" : ""}>
              <td><span className="ro-id-mono">…{o.id.slice(-6)}</span></td>
              <td><span className="ro-badge-sede">{getNombreRestaurante(o.restauranteId)}</span></td>
              {!modoUsuario && <td className="ro-celda-suave">{getNombreUsuario(o.usuarioId)}</td>}
              <td className="ro-total">${o.total?.toFixed(2)}</td>
              <td><span className={`ro-estado ${ESTADO_COLOR[o.estado] || ""}`}>{o.estado}</span></td>
              <td className="ro-celda-suave">{o.metodoPago}</td>
              <td className="ro-celda-suave">{o.tipoOrden}</td>
              <td className="ro-celda-suave">
                {o.fechaPedido
                  ? new Date(o.fechaPedido).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </td>
              <td>
                <div className="ro-acciones">
                  <button onClick={() => abrirDetalle(o.id)} className="ro-btn ro-btn-detalle" title="Ver detalle">👁️</button>
                  {isAdmin && o.estado !== "Cancelada" && (
                    <>
                      <button onClick={() => abrirEditar(o)} className="ro-btn ro-btn-edit" title="Editar">✏️</button>
                      <button onClick={() => handleCancelar(o.id)} className="ro-btn ro-btn-cancel" title="Cancelar">🚫</button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="ro-page">
      {mensaje && (
        <div className={`ro-toast ${mensajeTipo === "error" ? "ro-toast-error" : ""}`}>{mensaje}</div>
      )}

      {/* ── Header ── */}
      <div className="ro-header">
        <div className="ro-titulo-bloque">
          <h1>{isAdmin ? "Registro de Órdenes" : "Mis Pedidos"}</h1>
          <p className="ro-subtitulo">
            {isAdmin
              ? `${ordenesFiltradas.length} orden(es) · ${pendientesCount} pendiente(s)`
              : "Consulta el estado de tus pedidos con tu NIT"}
          </p>
        </div>

        {isAdmin && (
          <div className="ro-header-acciones">
            {pendientesCount > 0 && (
              <button className="ro-btn-completar" onClick={handleCompletarPendientes}>
                ✅ Completar {pendientesCount} pendiente{pendientesCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Vista USUARIO: buscar por NIT ── */}
      {!isAdmin && (
        <div className="ro-nit-section">
          <div className="ro-nit-card">
            <h3>🔍 Consultar pedidos por NIT</h3>
            <div className="ro-nit-row">
              <input
                type="number"
                placeholder="Ingresa tu NIT..."
                value={nitBusqueda}
                onChange={e => setNitBusqueda(e.target.value)}
                onKeyDown={e => e.key === "Enter" && buscarPorNit()}
                className="ro-nit-input"
              />
              <button className="ro-nit-btn" onClick={buscarPorNit}>Buscar</button>
            </div>

            {usuarioNit && (
              <div className="ro-nit-encontrado">
                ✅ <strong>{usuarioNit.nombre}</strong> — {ordenesDelUsuario.length} pedido(s)
              </div>
            )}
          </div>

          {usuarioNit && (
            ordenesDelUsuario.length > 0
              ? <TablaOrdenes lista={ordenesDelUsuario} modoUsuario />
              : <p className="ro-status">Este cliente no tiene órdenes registradas.</p>
          )}
        </div>
      )}

      {/* ── Vista ADMIN ── */}
      {isAdmin && (
        <>
          {/* Filtros */}
          <div className="ro-filtros">
            <div className="ro-filtro-grupo">
              <label>Estado</label>
              <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPagina(0); }} className="ro-select">
                <option value="">Todos</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>

            <div className="ro-filtro-grupo">
              <label>Sede</label>
              <select value={filtroRestaurante} onChange={e => { setFiltroRestaurante(e.target.value); setPagina(0); }} className="ro-select">
                <option value="">Todas</option>
                {restaurantes.map(r => (
                  <option key={r.id || r._id} value={r.id || r._id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div className="ro-filtro-grupo">
              <label>Buscar por ID</label>
              <input
                type="text"
                placeholder="últimos caracteres..."
                value={busquedaId}
                onChange={e => setBusquedaId(e.target.value)}
                className="ro-input-filtro"
              />
            </div>

            <button className="ro-btn-reset" onClick={() => {
              setFiltroEstado(""); setFiltroRestaurante(""); setBusquedaId(""); setPagina(0);
            }}>↺ Limpiar</button>
          </div>

          {/* Stats rápidas de estado */}
          <div className="ro-stats-bar">
            {ESTADOS.map(est => {
              const count = ordenes.filter(o => o.estado === est).length;
              return count > 0 ? (
                <button
                  key={est}
                  className={`ro-stat-chip ${ESTADO_COLOR[est]} ${filtroEstado === est ? "ro-stat-activo" : ""}`}
                  onClick={() => setFiltroEstado(filtroEstado === est ? "" : est)}
                >
                  {est} <span>{count}</span>
                </button>
              ) : null;
            })}
          </div>

          {loading
            ? <p className="ro-status">Cargando órdenes...</p>
            : <TablaOrdenes lista={ordenesFiltradas} />
          }

          {/* Paginación */}
          <div className="ro-paginacion">
            <button
              className="ro-pag-btn"
              onClick={() => setPagina(p => Math.max(0, p - 1))}
              disabled={pagina === 0}
            >← Anterior</button>
            <span className="ro-pag-info">Página {pagina + 1}</span>
            <button
              className="ro-pag-btn"
              onClick={() => setPagina(p => p + 1)}
              disabled={ordenes.length < POR_PAGINA}
            >Siguiente →</button>
          </div>
        </>
      )}

      {/* ── MODAL DETALLE ── */}
      {showDetalle && (
        <div className="ro-modal-overlay" onClick={() => setShowDetalle(false)}>
          <div className="ro-modal" onClick={e => e.stopPropagation()}>
            <h3>📋 Detalle de Orden</h3>

            {loadingDetalle ? (
              <p className="ro-status">Cargando...</p>
            ) : ordenDetalle ? (
              <>
                <div className="ro-detalle-grid">
                  {[
                    ["ID",        <span className="ro-mono">{ordenDetalle.id}</span>],
                    ["Estado",    <span className={`ro-estado ${ESTADO_COLOR[ordenDetalle.estado] || ""}`}>{ordenDetalle.estado}</span>],
                    ["Sede",      getNombreRestaurante(ordenDetalle.restauranteId)],
                    ["Cliente",   getNombreUsuario(ordenDetalle.usuarioId)],
                    ["Pago",      ordenDetalle.metodoPago],
                    ["Entrega",   ordenDetalle.tipoOrden],
                    ["Fecha",     ordenDetalle.fechaPedido ? new Date(ordenDetalle.fechaPedido).toLocaleString("es-ES") : "—"],
                    ["Total",     <strong>${ordenDetalle.total?.toFixed(2)}</strong>],
                  ].map(([k, v]) => (
                    <div key={k} className="ro-detalle-fila">
                      <span className="ro-detalle-key">{k}</span>
                      <span className="ro-detalle-val">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="ro-detalle-items">
                  <p className="ro-detalle-items-titulo">Artículos</p>
                  {ordenDetalle.items?.map((item, i) => (
                    <div key={i} className="ro-detalle-item-row">
                      <span className="ro-mono">{item.articuloId.slice(-6)}</span>
                      <span>×{item.cantidad}</span>
                      <span>${item.precioUnitario?.toFixed(2)} c/u</span>
                      <span className="ro-item-subtotal">${(item.precioUnitario * item.cantidad).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="ro-status">No se pudo cargar la orden.</p>}

            <div className="ro-modal-buttons">
              <button onClick={() => setShowDetalle(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR (admin) ── */}
      {showEditar && (
        <div className="ro-modal-overlay" onClick={() => setShowEditar(false)}>
          <form className="ro-modal" onSubmit={handleGuardarEdicion} onClick={e => e.stopPropagation()}>
            <h3>✏️ Editar Orden</h3>

            <div className="ro-modal-fields">
              <div className="ro-field">
                <label>Estado</label>
                <select value={formEditar.estado} onChange={e => setFormEditar({ ...formEditar, estado: e.target.value })}>
                  {ESTADOS.map(est => <option key={est} value={est}>{est}</option>)}
                </select>
              </div>

              <div className="ro-field">
                <label>Método de Pago</label>
                <select value={formEditar.metodoPago} onChange={e => setFormEditar({ ...formEditar, metodoPago: e.target.value })}>
                  {["Efectivo", "Tarjeta", "Transferencia"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="ro-field">
                <label>Tipo de Entrega</label>
                <select value={formEditar.tipoOrden} onChange={e => setFormEditar({ ...formEditar, tipoOrden: e.target.value })}>
                  {["Domicilio", "Para Llevar", "En Comedor"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="ro-modal-buttons">
              <button type="button" onClick={() => setShowEditar(false)}>Cancelar</button>
              <button type="submit" className="ro-btn-confirmar">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};