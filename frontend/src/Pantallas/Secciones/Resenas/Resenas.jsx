import { useEffect, useState } from "react";
import "./Resenas.css";
import { useNavigate } from "react-router";

export const Resenas = () => {
    const navigate = useNavigate();
    
  const [resenas, setResenas] = useState([]);
  const [restaurantes, setRestaurantes] = useState([]);
  const [nitBusqueda, setNitBusqueda] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState(""); // Para el buscador de sucursales
  
  const [formData, setFormData] = useState({
    restauranteId: "",
    usuarioId: "",
    calificacion: 5,
    comentario: ""
  });
  const [status, setStatus] = useState({ msg: "", isError: false });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resR, resU] = await Promise.all([
          fetch("http://localhost:8000/restaurantes/"),
          fetch("http://localhost:8000/resenas/")
        ]);
        setRestaurantes(await resR.json());
        setResenas((await resU.json()).reverse().slice(0, 8));
      } catch (e) { console.error("Error:", e); }
    };
    fetchData();
  }, []);

  // Lógica de búsqueda de usuario corregida
  useEffect(() => {
    const buscarUsuario = async () => {
      if (nitBusqueda.length > 2) {
        try {
          const res = await fetch(`http://localhost:8000/usuarios/`);
          const usuarios = await res.json();
          // CORRECCIÓN: Convertimos u.nit a String para comparar correctamente
          const encontrado = usuarios.find(u => String(u.nit) === nitBusqueda);
          
          if (encontrado) {
            setNombreUsuario(encontrado.nombre);
            setFormData(prev => ({ ...prev, usuarioId: encontrado.id }));
          } else {
            setNombreUsuario("");
            setFormData(prev => ({ ...prev, usuarioId: "" }));
          }
        } catch (e) { console.error(e); }
      } else {
        setNombreUsuario("");
        setFormData(prev => ({ ...prev, usuarioId: "" }));
      }
    };
    buscarUsuario();
  }, [nitBusqueda]);

  // Manejar la selección del datalist de sucursales
  const handleSucursalChange = (e) => {
    const seleccion = e.target.value;
    setFiltroSucursal(seleccion);
    const encontrado = restaurantes.find(r => r.nombre === seleccion);
    if (encontrado) {
      setFormData(prev => ({ ...prev, restauranteId: encontrado.id }));
    } else {
      setFormData(prev => ({ ...prev, restauranteId: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/resenas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus({ msg: "¡Reseña subida con éxito!", isError: false });
        setFormData({ restauranteId: "", usuarioId: "", comentario: "", calificacion: 5 });
        setNitBusqueda("");
        setFiltroSucursal("");
        // Recargar reseñas
        const update = await fetch("http://localhost:8000/resenas/");
        setResenas((await update.json()).reverse().slice(0, 8));
      }
    } catch (e) { setStatus({ msg: "Error de conexión", isError: true }); }
  };

  return (
    <section id="resenas" className="resenas-section">
      <h1 className="section-title">Lo que dicen nuestros clientes</h1>
      
      <div className="resenas-grid">
        {resenas.map((r) => (
          <div key={r.id} className="resena-card-container">
            <div className="resena-card-dashed">
              <div className="resena-stars">{"★".repeat(r.calificacion)}{"☆".repeat(5-r.calificacion)}</div>
              <p className="resena-texto">"{r.comentario}"</p>
              <small className="resena-fecha">{new Date(r.fecha).toLocaleDateString()}</small>
            </div>
          </div>
        ))}
      </div>

      <button className="inicio-boton"
      onClick={() => navigate("/resena-completas")} >
          Ver más reseñas
        </button>

      <div className="nueva-resena-form">
        <div className="resena-card-dashed">
          <h3>Deja tu opinión</h3>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Tu NIT:</label>
              <input 
                type="text" 
                className="input-dark"
                value={nitBusqueda} 
                onChange={(e) => setNitBusqueda(e.target.value)} 
                placeholder="Ej: 100000000" 
              />
              {nombreUsuario && <span className="user-found">Bienvenido, {nombreUsuario}</span>}
            </div>

            <div className="input-group">
              <label>Sucursal (Escribe para filtrar):</label>
              <input 
                list="sucursales-list"
                className="input-dark"
                value={filtroSucursal}
                onChange={handleSucursalChange}
                placeholder="Busca tu sucursal..."
                required
              />
              <datalist id="sucursales-list">
                {restaurantes.map(r => (
                  <option key={r.id} value={r.nombre} />
                ))}
              </datalist>
            </div>

            <div className="input-group">
              <label>Calificación:</label>
              <select className="input-dark" value={formData.calificacion} onChange={(e)=>setFormData({...formData, calificacion: parseInt(e.target.value)})}>
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} Estrellas</option>)}
              </select>
            </div>

            <textarea 
              className="input-dark"
              value={formData.comentario} 
              onChange={(e)=>setFormData({...formData, comentario: e.target.value})} 
              placeholder="¿Qué tal estuvo la comida?" 
              required 
            />

            <button 
              type="submit" 
              className="inicio-boton" 
              disabled={!formData.usuarioId || !formData.restauranteId}
            >
              Enviar Reseña
            </button>
          </form>
          {status.msg && <p className={status.isError ? "msg-error" : "msg-success"}>{status.msg}</p>}
        </div>
      </div>
    </section>
  );
};