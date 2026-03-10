// Ingredientes.jsx
import { useState, useEffect } from "react";
import "./Ingredientes.css";

export const Ingredientes = () => {
  const [ingredientes, setIngredientes] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeTipo, setMensajeTipo] = useState("ok");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRestaurante, setFiltroRestaurante] = useState("");
  const [ordenamiento, setOrdenamiento] = useState("nombre");

  // Modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formData, setFormData] = useState({
    restauranteId: "", nombre: "", cantidadDisponible: "",
    proveedor: "", unidadMedida: "", costoUnitario: "", fechaCompra: ""
  });

  // Modal compra
  const [showModalCompra, setShowModalCompra] = useState(false);
  const [ingredienteCompra, setIngredienteCompra] = useState(null);
  const [formCompra, setFormCompra] = useState({ cantidad: "", costoUnitario: "" });

  // Modal detalle
  const [showDetalle, setShowDetalle] = useState(false);
  const [ingredienteDetalle, setIngredienteDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  useEffect(() => { fetchTodo(); }, []);

  const showToast = (texto, tipo = "ok") => {
    setMensaje(texto); setMensajeTipo(tipo);
    setTimeout(() => setMensaje(null), 3500);
  };

  const fetchTodo = async () => {
    setLoading(true);
    try {
      const [rIng, rRest] = await Promise.all([
        fetch("http://localhost:8000/ingredientes/"),
        fetch("http://localhost:8000/restaurantes/")
      ]);
      setIngredientes(await rIng.json());
      setRestaurantes(await rRest.json());
    } catch { showToast("Error cargando datos", "error"); }
    finally { setLoading(false); }
  };

  const getNombreRestaurante = (id) => {
    const r = restaurantes.find(r => r.id === id || r._id === id);
    return r ? r.nombre : "Desconocido";
  };

  // ── CRUD ──────────────────────────────────────
  const abrirCrear = () => {
    setEditandoId(null);
    setFormData({ restauranteId: "", nombre: "", cantidadDisponible: "", proveedor: "", unidadMedida: "", costoUnitario: "", fechaCompra: "" });
    setShowModal(true);
  };

  const abrirEditar = (ing) => {
    setEditandoId(ing.id);
    setFormData({
      restauranteId: ing.restauranteId,
      nombre: ing.nombre,
      cantidadDisponible: ing.cantidadDisponible,
      proveedor: ing.proveedor || "",
      unidadMedida: ing.unidadMedida || "",
      costoUnitario: ing.costoUnitario || "",
      fechaCompra: ing.fechaCompra ? ing.fechaCompra.slice(0, 10) : ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = {
      restauranteId: formData.restauranteId,
      nombre: formData.nombre,
      cantidadDisponible: parseFloat(formData.cantidadDisponible),
      proveedor: formData.proveedor || null,
      unidadMedida: formData.unidadMedida || null,
      costoUnitario: formData.costoUnitario ? parseFloat(formData.costoUnitario) : null,
      fechaCompra: formData.fechaCompra ? new Date(formData.fechaCompra).toISOString() : null
    };

    const url = editandoId
      ? `http://localhost:8000/ingredientes/${editandoId}`
      : "http://localhost:8000/ingredientes/";

    try {
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(editandoId ? "✅ Ingrediente actualizado" : "✨ Ingrediente creado");
        setShowModal(false);
        fetchTodo();
      } else {
        const err = await res.json();
        showToast(err.detail || "Error al guardar", "error");
      }
    } catch { showToast("Error de conexión", "error"); }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar este ingrediente definitivamente?")) return;
    try {
      const res = await fetch(`http://localhost:8000/ingredientes/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("🗑️ Ingrediente eliminado"); fetchTodo(); }
      else showToast("Error al eliminar", "error");
    } catch { showToast("Error de conexión", "error"); }
  };

  // ── Compra ────────────────────────────────────
  const abrirCompra = (ing) => {
    setIngredienteCompra(ing);
    setFormCompra({ cantidad: "", costoUnitario: ing.costoUnitario || "" });
    setShowModalCompra(true);
  };

  const handleCompra = async (e) => {
    e.preventDefault();
    const body = {
      restauranteId: ingredienteCompra.restauranteId,
      ingredienteId: ingredienteCompra.id,
      cantidad: parseFloat(formCompra.cantidad),
      costoUnitario: parseFloat(formCompra.costoUnitario)
    };
    try {
      const res = await fetch("http://localhost:8000/ingredientes/registrar-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(`📦 Compra registrada — +${formCompra.cantidad} ${ingredienteCompra.unidadMedida || "u."}`);
        setShowModalCompra(false);
        fetchTodo();
      } else {
        const err = await res.json();
        showToast(err.detail || "Error al registrar compra", "error");
      }
    } catch { showToast("Error de conexión", "error"); }
  };

  // ── Detalle ───────────────────────────────────
  const abrirDetalle = async (id) => {
    setShowDetalle(true);
    setLoadingDetalle(true);
    setIngredienteDetalle(null);
    try {
      const res = await fetch(`http://localhost:8000/ingredientes/${id}`);
      setIngredienteDetalle(await res.json());
    } catch { showToast("Error cargando detalle", "error"); }
    finally { setLoadingDetalle(false); }
  };

  // ── Filtrado ──────────────────────────────────
  const ingredientesFiltrados = ingredientes
    .filter(i => {
      const coincide = i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (i.proveedor || "").toLowerCase().includes(busqueda.toLowerCase());
      const coincideRest = filtroRestaurante === "" || i.restauranteId === filtroRestaurante;
      return coincide && coincideRest;
    })
    .sort((a, b) => {
      if (ordenamiento === "nombre")     return a.nombre.localeCompare(b.nombre);
      if (ordenamiento === "cantidad-asc")  return a.cantidadDisponible - b.cantidadDisponible;
      if (ordenamiento === "cantidad-desc") return b.cantidadDisponible - a.cantidadDisponible;
      if (ordenamiento === "costo-desc") return (b.costoUnitario || 0) - (a.costoUnitario || 0);
      return 0;
    });

  // Alerta stock bajo (< 5 unidades)
  const stockBajo = ingredientes.filter(i => i.cantidadDisponible < 5).length;

  const getStockClass = (cantidad) => {
    if (cantidad < 5)  return "stock-critico";
    if (cantidad < 20) return "stock-bajo";
    return "stock-ok";
  };

  return (
    <div className="ingredientes-page">
      {mensaje && (
        <div className={`toast-ing ${mensajeTipo === "error" ? "toast-error" : ""}`}>
          {mensaje}
        </div>
      )}

      {/* ── Header ── */}
      <div className="ing-header">
        <div className="ing-titulo-bloque">
          <h1>Inventario de Ingredientes</h1>
          <p className="ing-subtitulo">
            {ingredientesFiltrados.length} ingrediente{ingredientesFiltrados.length !== 1 ? "s" : ""}
            {stockBajo > 0 && (
              <span className="alerta-stock"> · ⚠️ {stockBajo} con stock crítico</span>
            )}
          </p>
        </div>

        <div className="ing-header-acciones">
          <div className="ing-stats">
            <div className="stat-chip-ing">
              <span className="stat-num-ing">{ingredientes.length}</span>
              <span className="stat-label-ing">Total</span>
            </div>
            <div className="stat-chip-ing critico">
              <span className="stat-num-ing">{stockBajo}</span>
              <span className="stat-label-ing">Stock crítico</span>
            </div>
          </div>
          <button className="btn-nuevo-ing" onClick={abrirCrear}>
            ➕ Nuevo Ingrediente
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="ing-filtros">
        <div className="filtro-grupo-ing">
          <label>Buscar</label>
          <input
            type="text" placeholder="Nombre o proveedor..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-filtro-ing"
          />
        </div>

        <div className="filtro-grupo-ing">
          <label>Sede</label>
          <select value={filtroRestaurante} onChange={e => setFiltroRestaurante(e.target.value)} className="select-filtro-ing">
            <option value="">Todas las sedes</option>
            {restaurantes.map(r => (
              <option key={r.id || r._id} value={r.id || r._id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo-ing">
          <label>Ordenar por</label>
          <select value={ordenamiento} onChange={e => setOrdenamiento(e.target.value)} className="select-filtro-ing">
            <option value="nombre">Nombre A→Z</option>
            <option value="cantidad-asc">Menor stock primero</option>
            <option value="cantidad-desc">Mayor stock primero</option>
            <option value="costo-desc">Mayor costo primero</option>
          </select>
        </div>

        <button className="btn-reset-ing" onClick={() => {
          setBusqueda(""); setFiltroRestaurante(""); setOrdenamiento("nombre");
        }}>↺ Limpiar</button>
      </div>

      {/* ── Tabla ── */}
      {loading ? (
        <p className="ing-status">Cargando inventario...</p>
      ) : ingredientesFiltrados.length === 0 ? (
        <p className="ing-status">No se encontraron ingredientes.</p>
      ) : (
        <div className="tabla-ing-container">
          <table className="tabla-ing">
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Sede</th>
                <th>Stock</th>
                <th>Unidad</th>
                <th>Proveedor</th>
                <th>Costo unitario</th>
                <th>Última compra</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ingredientesFiltrados.map((ing, idx) => (
                <tr key={ing.id} style={{ animationDelay: `${idx * 0.025}s` }}>
                  <td>
                    <div className="ing-nombre-celda">
                      <div className="ing-icono">🧂</div>
                      <span className="ing-nombre-bold">{ing.nombre}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge-sede-ing">{getNombreRestaurante(ing.restauranteId)}</span>
                  </td>
                  <td>
                    <span className={`stock-badge ${getStockClass(ing.cantidadDisponible)}`}>
                      {ing.cantidadDisponible}
                    </span>
                  </td>
                  <td className="celda-suave">{ing.unidadMedida ?? <span className="sin-dato">—</span>}</td>
                  <td className="celda-suave">{ing.proveedor ?? <span className="sin-dato">—</span>}</td>
                  <td className="celda-precio">
                    {ing.costoUnitario != null
                      ? `$${ing.costoUnitario.toFixed(2)}`
                      : <span className="sin-dato">—</span>}
                  </td>
                  <td className="celda-suave">
                    {ing.fechaCompra
                      ? new Date(ing.fechaCompra).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                      : <span className="sin-dato">—</span>}
                  </td>
                  <td>
                    <div className="acciones-ing">
                      <button onClick={() => abrirDetalle(ing.id)} className="btn-ing btn-ing-detalle" title="Ver detalle">👁️</button>
                      <button onClick={() => abrirCompra(ing)} className="btn-ing btn-ing-compra" title="Registrar compra">📦</button>
                      <button onClick={() => abrirEditar(ing)} className="btn-ing btn-ing-edit" title="Editar">✏️</button>
                      <button onClick={() => handleEliminar(ing.id)} className="btn-ing btn-ing-delete" title="Eliminar">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {showModal && (
        <div className="modal-overlay-ing" onClick={() => setShowModal(false)}>
          <form className="modal-ing" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
            <h3>{editandoId ? "✏️ Editar Ingrediente" : "✨ Nuevo Ingrediente"}</h3>

            <div className="modal-ing-grid">
              <div className="field-ing full">
                <label>Sede *</label>
                <select required value={formData.restauranteId}
                  onChange={e => setFormData({ ...formData, restauranteId: e.target.value })}>
                  <option value="">— Selecciona una sede —</option>
                  {restaurantes.map(r => (
                    <option key={r.id || r._id} value={r.id || r._id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="field-ing full">
                <label>Nombre *</label>
                <input required placeholder="Ej: Harina 00, Tomate San Marzano..."
                  value={formData.nombre}
                  onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
              </div>

              <div className="field-ing">
                <label>Cantidad disponible *</label>
                <input required type="number" step="any" min="0" placeholder="0"
                  value={formData.cantidadDisponible}
                  onChange={e => setFormData({ ...formData, cantidadDisponible: e.target.value })} />
              </div>

              <div className="field-ing">
                <label>Unidad de medida</label>
                <input placeholder="kg, L, unidades..."
                  value={formData.unidadMedida}
                  onChange={e => setFormData({ ...formData, unidadMedida: e.target.value })} />
              </div>

              <div className="field-ing">
                <label>Proveedor</label>
                <input placeholder="Nombre del proveedor"
                  value={formData.proveedor}
                  onChange={e => setFormData({ ...formData, proveedor: e.target.value })} />
              </div>

              <div className="field-ing">
                <label>Costo unitario ($)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00"
                  value={formData.costoUnitario}
                  onChange={e => setFormData({ ...formData, costoUnitario: e.target.value })} />
              </div>

              <div className="field-ing full">
                <label>Fecha de compra</label>
                <input type="date"
                  value={formData.fechaCompra}
                  onChange={e => setFormData({ ...formData, fechaCompra: e.target.value })} />
              </div>
            </div>

            <div className="modal-ing-buttons">
              <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
              <button type="submit" className="btn-confirmar-ing">
                {editandoId ? "Guardar Cambios" : "Crear Ingrediente"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL REGISTRAR COMPRA ── */}
      {showModalCompra && ingredienteCompra && (
        <div className="modal-overlay-ing" onClick={() => setShowModalCompra(false)}>
          <form className="modal-ing modal-compra" onSubmit={handleCompra} onClick={e => e.stopPropagation()}>
            <h3>📦 Registrar Compra</h3>

            <div className="compra-info-card">
              <span className="compra-ingrediente-nombre">{ingredienteCompra.nombre}</span>
              <div className="compra-meta">
                <span>📍 {getNombreRestaurante(ingredienteCompra.restauranteId)}</span>
                <span>Stock actual: <strong>{ingredienteCompra.cantidadDisponible} {ingredienteCompra.unidadMedida || "u."}</strong></span>
              </div>
            </div>

            <div className="modal-ing-grid">
              <div className="field-ing">
                <label>Cantidad a agregar *</label>
                <input required type="number" step="any" min="0.01" placeholder="0"
                  value={formCompra.cantidad}
                  onChange={e => setFormCompra({ ...formCompra, cantidad: e.target.value })} />
                {formCompra.cantidad && (
                  <span className="compra-preview">
                    Nuevo stock: {(parseFloat(ingredienteCompra.cantidadDisponible) + parseFloat(formCompra.cantidad || 0)).toFixed(2)} {ingredienteCompra.unidadMedida || "u."}
                  </span>
                )}
              </div>

              <div className="field-ing">
                <label>Nuevo costo unitario ($) *</label>
                <input required type="number" step="0.01" min="0" placeholder="0.00"
                  value={formCompra.costoUnitario}
                  onChange={e => setFormCompra({ ...formCompra, costoUnitario: e.target.value })} />
                {formCompra.cantidad && formCompra.costoUnitario && (
                  <span className="compra-preview">
                    Total: ${(parseFloat(formCompra.cantidad) * parseFloat(formCompra.costoUnitario)).toFixed(2)}
                  </span>
                )}
              </div>
            </div>

            <div className="modal-ing-buttons">
              <button type="button" onClick={() => setShowModalCompra(false)}>Cancelar</button>
              <button type="submit" className="btn-confirmar-ing btn-compra-confirmar">
                Confirmar Compra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {showDetalle && (
        <div className="modal-overlay-ing" onClick={() => setShowDetalle(false)}>
          <div className="modal-ing modal-ing-detalle" onClick={e => e.stopPropagation()}>
            <h3>🧂 Detalle del Ingrediente</h3>

            {loadingDetalle ? (
              <p className="ing-status">Cargando...</p>
            ) : ingredienteDetalle ? (
              <div className="detalle-ing-grid">
                {[
                  ["ID", <span className="mono">{ingredienteDetalle.id}</span>],
                  ["Nombre", ingredienteDetalle.nombre],
                  ["Sede", getNombreRestaurante(ingredienteDetalle.restauranteId)],
                  ["Stock disponible", `${ingredienteDetalle.cantidadDisponible} ${ingredienteDetalle.unidadMedida || ""}`],
                  ["Unidad de medida", ingredienteDetalle.unidadMedida ?? "—"],
                  ["Proveedor", ingredienteDetalle.proveedor ?? "—"],
                  ["Costo unitario", ingredienteDetalle.costoUnitario != null ? `$${ingredienteDetalle.costoUnitario.toFixed(2)}` : "—"],
                  ["Última compra", ingredienteDetalle.fechaCompra
                    ? new Date(ingredienteDetalle.fechaCompra).toLocaleString("es-ES")
                    : "—"]
                ].map(([key, val]) => (
                  <div key={key} className="detalle-ing-fila">
                    <span className="detalle-ing-key">{key}</span>
                    <span className="detalle-ing-val">{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ing-status">No se pudo cargar el ingrediente.</p>
            )}

            <div className="modal-ing-buttons">
              <button type="button" onClick={() => setShowDetalle(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};