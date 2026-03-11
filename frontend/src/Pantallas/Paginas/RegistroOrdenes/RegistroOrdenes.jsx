// RegistroOrdenes.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import "./RegistroOrdenes.css";
import { useAdmin } from "../../../AdminContext";

const ESTADOS = ["Pendiente", "En Preparación", "En Camino", "Completada", "Cancelada"];

const ESTADO_COLOR = {
  "Pendiente":      "estado-pendiente",
  "En Preparación": "estado-preparacion",
  "En Camino":      "estado-camino",
  "Completada":     "estado-completada",
  "Cancelada":      "estado-cancelada",
};

const POR_PAGINA = 10;

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const RegistroOrdenes = () => {
  const { isAdmin } = useAdmin();

  // Órdenes (paginadas)
  const [ordenes, setOrdenes] = useState([]);
  const [totalOrdenes, setTotalOrdenes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeTipo, setMensajeTipo] = useState("ok");

  // Lookups — cargados una sola vez, guardados como Map para O(1)
  const [restaurantesMap, setRestaurantesMap] = useState(new Map());
  const [restaurantesLista, setRestaurantesLista] = useState([]);
  const [usuariosMap, setUsuariosMap] = useState(new Map());

  // Vista usuario: búsqueda por NIT
  const [nitBusqueda, setNitBusqueda] = useState("");
  const [usuarioNit, setUsuarioNit] = useState(null);
  const [ordenesNit, setOrdenesNit] = useState([]);
  const [loadingNit, setLoadingNit] = useState(false);

  // Filtros admin
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroRestaurante, setFiltroRestaurante] = useState("");
  const [busquedaId, setBusquedaId] = useState("");
  const busquedaIdDebounced = useDebounce(busquedaId, 400);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(totalOrdenes / POR_PAGINA));

  // Modales
  const [showDetalle, setShowDetalle] = useState(false);
  const [ordenDetalle, setOrdenDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [showEditar, setShowEditar] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formEditar, setFormEditar] = useState({ estado: "", metodoPago: "", tipoOrden: "" });

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = (texto, tipo = "ok") => {
    setMensaje(texto); setMensajeTipo(tipo);
    setTimeout(() => setMensaje(null), 3500);
  };

  // ── Cargar lookups una sola vez ──────────────────────────────────────────
  // Restaurantes y usuarios no cambian con los filtros de órdenes,
  // así que los traemos una vez y los indexamos en un Map.
  useEffect(() => {
    const cargarLookups = async () => {
      try {
        const [rR, rU] = await Promise.all([
          fetch("http://localhost:8000/restaurantes/"),
          // Traemos todos los usuarios en una sola página grande solo para lookups de nombre
          fetch("http://localhost:8000/usuarios/?page=1&page_size=200"),
        ]);

        const dataR = await rR.json();
        const dataU = await rU.json();

        // Restaurantes (respuesta plana)
        const rLista = Array.isArray(dataR) ? dataR : (dataR.items ?? []);
        setRestaurantesLista(rLista);
        setRestaurantesMap(new Map(rLista.map(r => [r.id ?? r._id, r.nombre])));

        // Usuarios (respuesta paginada o plana)
        const uLista = Array.isArray(dataU) ? dataU : (dataU.items ?? []);
        setUsuariosMap(new Map(uLista.map(u => [u.id, u])));
      } catch {
        showToast("Error cargando datos de referencia", "error");
      }
    };
    cargarLookups();
  }, []);

  // ── Fetch órdenes paginado ───────────────────────────────────────────────
  const fetchOrdenes = useCallback(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ skip: (pagina - 1) * POR_PAGINA, limit: POR_PAGINA });
        if (filtroEstado)        params.set("estado", filtroEstado);
        if (filtroRestaurante)   params.set("restaurante_id", filtroRestaurante);
        if (busquedaIdDebounced) params.set("q", busquedaIdDebounced);

        const res = await fetch(`http://localhost:8000/ordenes/?${params}`);
        const data = await res.json();

        const lista = Array.isArray(data) ? data : (data.items ?? []);
        if (!Array.isArray(data)) setTotalOrdenes(data.total ?? 0);
        else setTotalOrdenes(data.length);

        // ── Fetch usuarios faltantes en paralelo ──
        const idsNuevos = [...new Set(lista.map(o => o.usuarioId))]
          .filter(id => id && !usuariosMap.has(id));

        if (idsNuevos.length > 0) {
          const resultados = await Promise.allSettled(
            idsNuevos.map(id => fetch(`http://localhost:8000/usuarios/${id}`).then(r => r.json()))
          );

          setUsuariosMap(prev => {
            const next = new Map(prev);
            resultados.forEach((r, i) => {
              if (r.status === "fulfilled" && r.value?.id) {
                next.set(idsNuevos[i], r.value);
              }
            });
            return next;
          });
        }

        setOrdenes(lista);
      } catch {
        showToast("Error cargando órdenes", "error");
      } finally {
        setLoading(false);
      }
    }, [pagina, filtroEstado, filtroRestaurante, busquedaIdDebounced, usuariosMap]);

  useEffect(() => { fetchOrdenes(); }, [fetchOrdenes]);

  // Volver a página 1 cuando cambia un filtro
  useEffect(() => { setPagina(1); }, [filtroEstado, filtroRestaurante, busquedaIdDebounced]);

  // ── Helpers lookup (O(1) con Map) ────────────────────────────────────────
  const getNombreRestaurante = (id) => restaurantesMap.get(id) ?? "—";
  const getNombreUsuario     = (id) => usuariosMap.get(id)?.nombre ?? id?.slice(-6) ?? "—";

  // ── Vista usuario: buscar por NIT ────────────────────────────────────────
  const buscarPorNit = async () => {
    if (!nitBusqueda.trim()) return;
    setLoadingNit(true);
    setUsuarioNit(null);
    setOrdenesNit([]);
    try {
      // Buscar usuario por NIT directamente en el back
      const resU = await fetch(`http://localhost:8000/usuarios/?nit=${nitBusqueda.trim()}`);
      const dataU = await resU.json();
      const lista = Array.isArray(dataU) ? dataU : (dataU.items ?? []);
      const u = (dataU.items ?? [])[0];
      if (!u) {
        showToast("NIT no encontrado en el sistema", "error");
        return;
      }

      setUsuarioNit(u);

      // Traer órdenes de ese usuario
      const resO = await fetch(`http://localhost:8000/ordenes/?usuario_id=${u.id}&limit=50`);
      const dataO = await resO.json();
      setOrdenesNit(Array.isArray(dataO) ? dataO : (dataO.items ?? []));
    } catch {
      showToast("Error buscando usuario", "error");
    } finally {
      setLoadingNit(false);
    }
  };

  // ── Acciones ─────────────────────────────────────────────────────────────
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
        fetchOrdenes();
      } else showToast("Error al actualizar", "error");
    } catch { showToast("Error de conexión", "error"); }
  };

  const handleCancelar = async (id) => {
    if (!window.confirm("¿Cancelar esta orden?")) return;
    try {
      const res = await fetch(`http://localhost:8000/ordenes/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("🚫 Orden cancelada"); fetchOrdenes(); }
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
        fetchOrdenes();
      } else showToast("Error al completar", "error");
    } catch { showToast("Error de conexión", "error"); }
  };

  const pendientesCount = ordenes.filter(o => o.estado === "Pendiente").length;

  // ── Tabla compartida ──────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ro-page">
      {mensaje && (
        <div className={`ro-toast ${mensajeTipo === "error" ? "ro-toast-error" : ""}`}>{mensaje}</div>
      )}

      {/* Header */}
      <div className="ro-header">
        <div className="ro-titulo-bloque">
          <h1>{isAdmin ? "Registro de Órdenes" : "Mis Pedidos"}</h1>
          <p className="ro-subtitulo">
            {isAdmin
              ? `${totalOrdenes} orden(es) · ${pendientesCount} pendiente(s)`
              : "Consulta el estado de tus pedidos con tu NIT"}
          </p>
        </div>
        {isAdmin && pendientesCount > 0 && (
          <div className="ro-header-acciones">
            <button className="ro-btn-completar" onClick={handleCompletarPendientes}>
              ✅ Completar {pendientesCount} pendiente{pendientesCount !== 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>

      {/* Vista USUARIO */}
      {!isAdmin && (
        <div className="ro-nit-section">
          <div className="ro-nit-card">
            <h3>🔍 Consultar pedidos por NIT</h3>
            <div className="ro-nit-row">
              <input
                type="number" placeholder="Ingresa tu NIT..."
                value={nitBusqueda}
                onChange={e => setNitBusqueda(e.target.value)}
                onKeyDown={e => e.key === "Enter" && buscarPorNit()}
                className="ro-nit-input"
              />
              <button className="ro-nit-btn" onClick={buscarPorNit} disabled={loadingNit}>
                {loadingNit ? "Buscando..." : "Buscar"}
              </button>
            </div>
            {usuarioNit && (
              <div className="ro-nit-encontrado">
                ✅ <strong>{usuarioNit.nombre}</strong> — {ordenesNit.length} pedido(s)
              </div>
            )}
          </div>
          {usuarioNit && (
            ordenesNit.length > 0
              ? <TablaOrdenes lista={ordenesNit} modoUsuario />
              : <p className="ro-status">Este cliente no tiene órdenes registradas.</p>
          )}
        </div>
      )}

      {/* Vista ADMIN */}
      {isAdmin && (
        <>
          {/* Filtros */}
          <div className="ro-filtros">
            <div className="ro-filtro-grupo">
              <label>Estado</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="ro-select">
                <option value="">Todos</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="ro-filtro-grupo">
              <label>Sede</label>
              <select value={filtroRestaurante} onChange={e => setFiltroRestaurante(e.target.value)} className="ro-select">
                <option value="">Todas</option>
                {restaurantesLista.map(r => (
                  <option key={r.id ?? r._id} value={r.id ?? r._id}>{r.nombre}</option>
                ))}
              </select>
            </div>
            <div className="ro-filtro-grupo">
              <label>Buscar por ID</label>
              <input
                type="text" placeholder="últimos caracteres..."
                value={busquedaId}
                onChange={e => setBusquedaId(e.target.value)}
                className="ro-input-filtro"
              />
            </div>
            <button className="ro-btn-reset" onClick={() => {
              setFiltroEstado(""); setFiltroRestaurante(""); setBusquedaId(""); setPagina(1);
            }}>↺ Limpiar</button>
          </div>

          {/* Stats rápidas */}
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
            : <TablaOrdenes lista={ordenes} />
          }

          {/* Paginación */}
          <div className="ro-paginacion">
            <button
              className="ro-pag-btn"
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
            >← Anterior</button>
            <span className="ro-pag-info">
              Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
              &nbsp;·&nbsp;{totalOrdenes} órdenes
            </span>
            <button
              className="ro-pag-btn"
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
            >Siguiente →</button>
          </div>
        </>
      )}

      {/* MODAL DETALLE */}
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
                    ["ID",      <span className="ro-mono">{ordenDetalle.id}</span>],
                    ["Estado",  <span className={`ro-estado ${ESTADO_COLOR[ordenDetalle.estado] || ""}`}>{ordenDetalle.estado}</span>],
                    ["Sede",    getNombreRestaurante(ordenDetalle.restauranteId)],
                    ["Cliente", getNombreUsuario(ordenDetalle.usuarioId)],
                    ["Pago",    ordenDetalle.metodoPago],
                    ["Entrega", ordenDetalle.tipoOrden],
                    ["Fecha",   ordenDetalle.fechaPedido ? new Date(ordenDetalle.fechaPedido).toLocaleString("es-ES") : "—"],
                    ["Total",   <strong>${ordenDetalle.total?.toFixed(2)}</strong>],
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

      {/* MODAL EDITAR */}
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
