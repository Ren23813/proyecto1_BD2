import { useState, useEffect } from "react";
import "./NuevoPedido.css";
import { useNavigate } from "react-router";

export const NuevoPedido = () => {
  const [restaurantes, setRestaurantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [menuCompleto, setMenuCompleto] = useState([]);
  
  // Selección de Sede y Usuario
  const [sedeNombre, setSedeNombre] = useState("");
  const [nitBusqueda, setNitBusqueda] = useState("");
  const [usuarioEncontrado, setUsuarioEncontrado] = useState(null);
  const navigate = useNavigate();

  
  // Datos para Nuevo Usuario (si no existe)
  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", email: "" });
  
  // Datos del Carrito y Orden
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [tipoOrden, setTipoOrden] = useState("Domicilio");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mensajeModal, setMensajeModal] = useState({ titulo: "", cuerpo: "", esExito: false });

  const actualizarCantidad = (id, delta) => {
  setCarrito(prev => prev.map(item => 
    item.articuloId === id 
      ? { ...item, cantidad: Math.max(0, item.cantidad + delta) } 
      : item
  ).filter(item => item.cantidad > 0)); // Si llega a 0, se elimina del carrito
};
  useEffect(() => {
    const fetchData = async () => {
      const [resR, resM, resU] = await Promise.all([
        fetch("http://localhost:8000/restaurantes/"),
        fetch("http://localhost:8000/articulosMenu/"),
        fetch("http://localhost:8000/usuarios/")
      ]);
      setRestaurantes(await resR.json());
      setMenuCompleto(await resM.json());
      setUsuarios(await resU.json());
    };
    fetchData();
  }, []);

  // Lógica de búsqueda de Usuario por NIT
  useEffect(() => {
    const user = usuarios.find(u => u.nit?.toString() === nitBusqueda);
    if (user) {
      setUsuarioEncontrado(user);
    } else {
      setUsuarioEncontrado(null);
    }
  }, [nitBusqueda, usuarios]);

  const idRestaurante = restaurantes.find(r => r.nombre === sedeNombre)?.id;
  const platillosDisponibles = menuCompleto.filter(p => p.restauranteId === idRestaurante && p.disponible);

  const agregarAlCarrito = (p) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.articuloId === p.id);
      return ex ? prev.map(i => i.articuloId === p.id ? {...i, cantidad: i.cantidad + 1} : i) 
                : [...prev, { articuloId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }];
    });
  };

  const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  const procesarPedido = async () => {
    try {
      let finalUsuarioId = usuarioEncontrado?.id;

      // 1. Crear usuario si no existe
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
        const dataUser = await resUser.json();
        finalUsuarioId = dataUser.id;
      }

      // 2. Crear la orden
      const orden = {
        usuarioId: finalUsuarioId,
        restauranteId: restaurantes.find(r => r.nombre === sedeNombre)?.id,
        items: carrito.map(i => ({ articuloId: i.articuloId, cantidad: i.cantidad })),
        metodoPago,
        tipoOrden
      };

      const resOrden = await fetch("http://localhost:8000/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orden)
      });

      if (resOrden.ok) {
        setMensajeModal({
          titulo: "¡Pedido Confirmado!",
          cuerpo: "Tu orden ha sido procesada y el inventario actualizado correctamente.",
          esExito: true
        });
      } else {
        const errorData = await resOrden.json();
        throw new Error(errorData.detail || "Error en la transacción");
      }
    } catch (error) {
      setMensajeModal({
        titulo: "Error en el Pedido",
        cuerpo: error.message,
        esExito: false
      });
    } finally {
      setMostrarModal(true);
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    if (mensajeModal.esExito) {
      setCarrito([]);
      navigate("/pedidos"); // Redirige al Home de pedidos si fue exitoso
    }
  };

  return (
    <div className="nuevo-pedido-page">
      {/* COMPONENTE DEL POP-UP (MODAL) */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${mensajeModal.esExito ? 'exito' : 'error'}`}>
            <div className="modal-icon">{mensajeModal.esExito ? "✅" : "❌"}</div>
            <h2>{mensajeModal.titulo}</h2>
            <p>{mensajeModal.cuerpo}</p>
            <button className="btn-modal" onClick={cerrarModal}>
              {mensajeModal.esExito ? "Volver a Pedidos" : "Intentar de nuevo"}
            </button>
          </div>
        </div>
      )}

      <h1 className="titulo-pedido">Finalizar Compra</h1>
      
      <div className="pedido-layout">
        {/* COLUMNA IZQUIERDA: DATOS */}
        <div className="seccion-datos">
          <div className="card-formulario">
            <h3>1. Datos del Cliente</h3>
            <div className="input-group">
              <label>NIT del Cliente:</label>
              <input 
                type="number" 
                placeholder="Ej: 778899" 
                value={nitBusqueda}
                onChange={(e) => setNitBusqueda(e.target.value)}
              />
            </div>

            {usuarioEncontrado ? (
              <div className="usuario-alerta success">
                ✅ Cliente encontrado: <strong>{usuarioEncontrado.nombre}</strong>
              </div>
            ) : nitBusqueda && (
              <div className="nuevo-usuario-form">
                <p className="alerta-info">⚠️ NIT no registrado. Ingresa datos para el alta:</p>
                <input 
                  type="text" 
                  placeholder="Nombre Completo" 
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})}
                />
                <input 
                  type="email" 
                  placeholder="Correo Electrónico" 
                  onChange={(e) => setNuevoUsuario({...nuevoUsuario, email: e.target.value})}
                />
              </div>
            )}
          </div>

          <div className="card-formulario">
            <h3>2. Sede y Método</h3>
            <div className="input-group">
              <label>Seleccionar Sede:</label>
              <input list="sedes" placeholder="Buscar sede..." onChange={(e) => setSedeNombre(e.target.value)} />
              <datalist id="sedes">
                {restaurantes.map(r => <option key={r.id} value={r.nombre} />)}
              </datalist>
            </div>

            <div className="row">
              <div className="input-group">
                <label>Método de Pago:</label>
                <select onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta de Crédito</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div className="input-group">
                <label>Tipo de Entrega:</label>
                <select onChange={(e) => setTipoOrden(e.target.value)}>
                  <option value="Domicilio">A Domicilio</option>
                  <option value="Para Llevar">Para Llevar</option>
                  <option value="En Comedor">En el Restaurante</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: CARRITO */}
        <div className="seccion-carrito">
          <div className="card-carrito">
            <h3>Resumen del Pedido</h3>
            <div className="menu-disponible">
              <small>Añadir platos de la sede:</small>
              {platillosDisponibles.map(p => (
                <button key={p.id} className="btn-mini-add" onClick={() => agregarAlCarrito(p)}>
                  + {p.nombre} (${p.precio})
                </button>
              ))}
            </div>
            
            <div className="lista-carrito">
              {carrito.map(item => (
                <div key={item.articuloId} className="item-carrito-controles">
                  <div className="info-item">
                    <strong>{item.nombre}</strong>
                    <span>${(item.precio * item.cantidad).toFixed(2)}</span>
                  </div>
                  <div className="controles-cantidad">
                    <button className="btn-qty" onClick={() => actualizarCantidad(item.articuloId, -1)}>-</button>
                    <span className="qty-num">{item.cantidad}</span>
                    <button className="btn-qty" onClick={() => actualizarCantidad(item.articuloId, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="total-pedido">
              <span>Total a Pagar:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button 
              className="btn-finalizar" 
              onClick={procesarPedido}
              disabled={!idRestaurante || carrito.length === 0 || (!usuarioEncontrado && !nuevoUsuario.nombre)}
            >
              Confirmar Orden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};