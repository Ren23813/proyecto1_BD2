import { useState, useEffect } from "react";
import "./NuevoPedido.css";
import { useNavigate } from "react-router";
import { useAdmin } from "../../../AdminContext";

export const NuevoPedido = () => {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [restaurantes, setRestaurantes] = useState([]);
  const [menuCompleto, setMenuCompleto] = useState([]);

  // Cliente
  const [nitBusqueda, setNitBusqueda] = useState("");
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", email: "" });

  // Sede y orden
  const [sedeNombre, setSedeNombre] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [tipoOrden, setTipoOrden] = useState("Domicilio");
  const [notaEspecial, setNotaEspecial] = useState("");

  // Carrito
  const [carrito, setCarrito] = useState([]);
  const [busquedaMenu, setBusquedaMenu] = useState("");

  // Modal resultado
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mensajeModal, setMensajeModal] = useState({ titulo: "", cuerpo: "", esExito: false });
  const [procesando, setProcesando] = useState(false);

  // ── Carga inicial: restaurantes y menú (sin usuarios) ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resR, resM] = await Promise.all([
          fetch("http://localhost:8000/restaurantes/"),
          fetch("http://localhost:8000/articulosMenu/"),
        ]);
        setRestaurantes(await resR.json());
        setMenuCompleto(await resM.json());
      } catch { console.error("Error cargando datos iniciales"); }
    };
    fetchData();
  }, []);

  // ── Buscar usuario por NIT contra el backend ──
  useEffect(() => {
    if (!nitBusqueda) { setUsuarioEncontrado(null); return; }

    const buscar = async () => {
      try {
        const res = await fetch(`http://localhost:8000/usuarios/?nit=${nitBusqueda}`);
        const data = await res.json();
        const encontrado = (data.items ?? [])[0] ?? null;
        setUsuarioEncontrado(encontrado);
      } catch { setUsuarioEncontrado(null); }
    };

    buscar();
  }, [nitBusqueda]);

  const idRestaurante = restaurantes.find(r => r.nombre === sedeNombre)?.id;

  const platillosDisponibles = menuCompleto
    .filter(p => p.restauranteId === idRestaurante && p.disponible)
    .filter(p => p.nombre.toLowerCase().includes(busquedaMenu.toLowerCase()));

  // ── Carrito ──
  const agregarAlCarrito = (p) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.articuloId === p.id);
      return ex
        ? prev.map(i => i.articuloId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
        : [...prev, { articuloId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, imagen: p.imagen }];
    });
  };

  const actualizarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev.map(item =>
        item.articuloId === id ? { ...item, cantidad: Math.max(0, item.cantidad + delta) } : item
      ).filter(item => item.cantidad > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0);

  // ── Validación ──
  const puedeConfirmar =
    idRestaurante &&
    carrito.length > 0 &&
    (usuarioEncontrado || (nitBusqueda && nuevoUsuario.nombre && nuevoUsuario.email));

  // ── Procesar pedido ──
  const procesarPedido = async () => {
    setProcesando(true);
    try {
      let finalUsuarioId = usuarioEncontrado?.id;

      if (!usuarioEncontrado) {
        const resUser = await fetch("http://localhost:8000/usuarios/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nuevoUsuario.nombre,
            email: nuevoUsuario.email,
            nit: parseInt(nitBusqueda),
            roles: ["cliente"],
            activo: true
          })
        });
        if (!resUser.ok) throw new Error("Error al registrar nuevo usuario");
        finalUsuarioId = (await resUser.json()).id;
      }

      const orden = {
        usuarioId: finalUsuarioId,
        restauranteId: idRestaurante,
        items: carrito.map(i => ({ articuloId: i.articuloId, cantidad: i.cantidad })),
        metodoPago,
        tipoOrden,
        ...(notaEspecial && { nota: notaEspecial })
      };

      const resOrden = await fetch("http://localhost:8000/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orden)
      });

      if (resOrden.ok) {
        setMensajeModal({ titulo: "¡Pedido Confirmado!", cuerpo: "La orden fue procesada e inventario actualizado correctamente.", esExito: true });
      } else {
        const err = await resOrden.json();
        throw new Error(err.detail || "Error en la transacción");
      }
    } catch (error) {
      setMensajeModal({ titulo: "Error en el Pedido", cuerpo: error.message, esExito: false });
    } finally {
      setProcesando(false);
      setMostrarModal(true);
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    if (mensajeModal.esExito) {
      setCarrito([]);
      navigate("/pedidos");
    }
  };

  const METODOS_PAGO = ["Efectivo", "Tarjeta", "Transferencia"];
  const TIPOS_ORDEN = ["Domicilio", "Para Llevar", "En Comedor"];

  return (
    <div className="np-page">

      {/* ── Modal resultado ── */}
      {mostrarModal && (
        <div className="np-modal-overlay" onClick={cerrarModal}>
          <div className={`np-modal-card ${mensajeModal.esExito ? "np-modal-ok" : "np-modal-err"}`} onClick={e => e.stopPropagation()}>
            <div className="np-modal-icon">{mensajeModal.esExito ? "✅" : "❌"}</div>
            <h2>{mensajeModal.titulo}</h2>
            <p>{mensajeModal.cuerpo}</p>
            <button className="np-modal-btn" onClick={cerrarModal}>
              {mensajeModal.esExito ? "Volver a Pedidos" : "Intentar de nuevo"}
            </button>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="np-header">
        <div>
          <h1>Nueva Orden</h1>
          <p className="np-subtitulo">Completa los datos para registrar un pedido</p>
        </div>
        {carrito.length > 0 && (
          <div className="np-header-badge">
            🛒 {totalItems} ítem{totalItems !== 1 ? "s" : ""} · <strong>${total.toFixed(2)}</strong>
          </div>
        )}
      </div>

      <div className="np-layout">

        {/* ── Columna izquierda ── */}
        <div className="np-col-datos">

          {/* Paso 1: Cliente */}
          <div className="np-card">
            <div className="np-card-title">
              <span className="np-step">1</span>
              <h3>Datos del Cliente</h3>
            </div>

            <div className="np-field">
              <label>NIT del Cliente</label>
              <input
                type="number"
                placeholder="Ej: 778899"
                value={nitBusqueda}
                onChange={e => setNitBusqueda(e.target.value)}
              />
            </div>

            {usuarioEncontrado ? (
              <div className="np-alerta np-alerta-ok">
                <span>✅</span>
                <div>
                  <strong>{usuarioEncontrado.nombre}</strong>
                  <small>{usuarioEncontrado.email}</small>
                </div>
              </div>
            ) : nitBusqueda && (
              <div className="np-nuevo-usuario">
                <div className="np-alerta np-alerta-warn">
                  <span>⚠️</span>
                  <span>NIT no registrado — completa el alta del cliente</span>
                </div>
                <div className="np-field">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={nuevoUsuario.nombre}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                  />
                </div>
                <div className="np-field">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={nuevoUsuario.email}
                    onChange={e => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Paso 2: Sede y entrega */}
          <div className="np-card">
            <div className="np-card-title">
              <span className="np-step">2</span>
              <h3>Sede y Entrega</h3>
            </div>

            <div className="np-field">
              <label>Seleccionar Sede</label>
              <input
                list="sedes-list"
                placeholder="Escribe o elige una sede..."
                value={sedeNombre}
                onChange={e => { setSedeNombre(e.target.value); setCarrito([]); setBusquedaMenu(""); }}
              />
              <datalist id="sedes-list">
                {restaurantes.map(r => <option key={r.id} value={r.nombre} />)}
              </datalist>
            </div>

            <div className="np-row-2">
              <div className="np-field">
                <label>Método de Pago</label>
                <div className="np-chips">
                  {METODOS_PAGO.map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`np-chip ${metodoPago === m ? "np-chip-activo" : ""}`}
                      onClick={() => setMetodoPago(m)}
                    >{m}</button>
                  ))}
                </div>
              </div>

              <div className="np-field">
                <label>Tipo de Entrega</label>
                <div className="np-chips">
                  {TIPOS_ORDEN.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`np-chip ${tipoOrden === t ? "np-chip-activo" : ""}`}
                      onClick={() => setTipoOrden(t)}
                    >{t}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="np-field">
              <label>Nota especial (opcional)</label>
              <textarea
                placeholder="Indicaciones, alergias, preferencias..."
                value={notaEspecial}
                onChange={e => setNotaEspecial(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Paso 3: Menú */}
          <div className="np-card">
            <div className="np-card-title">
              <span className="np-step">3</span>
              <h3>Agregar Platillos</h3>
            </div>

            {!idRestaurante ? (
              <p className="np-hint">Selecciona una sede para ver el menú disponible.</p>
            ) : (
              <>
                <div className="np-field">
                  <input
                    type="text"
                    placeholder="Buscar en el menú..."
                    value={busquedaMenu}
                    onChange={e => setBusquedaMenu(e.target.value)}
                  />
                </div>
                <div className="np-menu-grid">
                  {platillosDisponibles.length === 0 ? (
                    <p className="np-hint">No hay platillos disponibles.</p>
                  ) : platillosDisponibles.map(p => {
                    const enCarrito = carrito.find(i => i.articuloId === p.id);
                    return (
                      <div
                        key={p.id}
                        className={`np-platillo-card ${enCarrito ? "np-platillo-en-carrito" : ""}`}
                        onClick={() => agregarAlCarrito(p)}
                      >
                        {p.imagen && (
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="np-platillo-img"
                            onError={e => e.target.style.display = "none"}
                          />
                        )}
                        <div className="np-platillo-info">
                          <span className="np-platillo-nombre">{p.nombre}</span>
                          <span className="np-platillo-precio">${p.precio.toFixed(2)}</span>
                        </div>
                        {enCarrito && (
                          <span className="np-platillo-qty-badge">{enCarrito.cantidad}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Columna derecha: carrito ── */}
        <div className="np-col-carrito">
          <div className="np-carrito-card">
            <h3 className="np-carrito-titulo">
              🛒 Resumen del Pedido
              {carrito.length > 0 && <span className="np-carrito-count">{totalItems}</span>}
            </h3>

            {carrito.length === 0 ? (
              <div className="np-carrito-vacio">
                <span>🍽️</span>
                <p>Agrega platillos desde el menú</p>
              </div>
            ) : (
              <div className="np-carrito-lista">
                {carrito.map(item => (
                  <div key={item.articuloId} className="np-carrito-item">
                    <div className="np-carrito-item-info">
                      <span className="np-carrito-item-nombre">{item.nombre}</span>
                      <span className="np-carrito-item-subtotal">${(item.precio * item.cantidad).toFixed(2)}</span>
                    </div>
                    <div className="np-qty-controles">
                      <button className="np-qty-btn" onClick={() => actualizarCantidad(item.articuloId, -1)}>−</button>
                      <span className="np-qty-num">{item.cantidad}</span>
                      <button className="np-qty-btn" onClick={() => actualizarCantidad(item.articuloId, 1)}>+</button>
                    </div>
                    <span className="np-carrito-item-unit">${item.precio.toFixed(2)} c/u</span>
                  </div>
                ))}
              </div>
            )}

            {/* Resumen de configuración */}
            {(metodoPago || tipoOrden) && (
              <div className="np-carrito-config">
                <span>💳 {metodoPago}</span>
                <span>📦 {tipoOrden}</span>
              </div>
            )}

            <div className="np-carrito-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button
              className="np-btn-confirmar"
              onClick={procesarPedido}
              disabled={!puedeConfirmar || procesando}
            >
              {procesando ? "Procesando..." : "Confirmar Orden"}
            </button>

            {!puedeConfirmar && (
              <ul className="np-validacion-lista">
                {!nitBusqueda && <li>Ingresa el NIT del cliente</li>}
                {nitBusqueda && !usuarioEncontrado && !nuevoUsuario.nombre && <li>Completa el alta del nuevo cliente</li>}
                {!idRestaurante && <li>Selecciona una sede</li>}
                {carrito.length === 0 && <li>Agrega al menos un platillo</li>}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};