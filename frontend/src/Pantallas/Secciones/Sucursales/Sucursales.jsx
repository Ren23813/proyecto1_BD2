import { useEffect, useState } from "react";
import "./Sucursales.css";
import { SucursalCard } from "../../../Componentes/SucursalCard/SucursalCard";
import { useNavigate } from "react-router-dom";




export const Sucursales = () => {
  const [sucursalesData, setSucursalesData] = useState([]);
  const [indexActual, setIndexActual] = useState(0);
  const navigate = useNavigate()

  // Función para convertir un string (ID de Mongo) en un número entero
  const generarSemillaNumerica = (id) => {
    if (!id) return 1;
    // Convertimos el string a una suma de valores de caracteres
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash); // Siempre positivo
  };

  useEffect(() => {
    const fetchSucursales = async () => {
      try {
        const response = await fetch("http://localhost:8000/restaurantes/");
        const data = await response.json();
        setSucursalesData(data);
      } catch (error) {
        console.error("Error cargando sucursales de la DB:", error);
      }
    };
    fetchSucursales();
  }, []);
 

  // Rotación automática (solo si hay datos)
  useEffect(() => {
    if (sucursalesData.length === 0) return;

    const intervalo = setInterval(() => {
      setIndexActual((prev) => (prev + 1) % sucursalesData.length);
    }, 3000);

    return () => clearInterval(intervalo);
  }, [sucursalesData.length]);


  const getVisibleItems = () => {
    if (sucursalesData.length === 0) return [];
    const items = [];
    // Si tienes menos de 3, ajustamos el loop
    const cantidadAMostrar = Math.min(3, sucursalesData.length);
    for (let i = 0; i < cantidadAMostrar; i++) {
      items.push(sucursalesData[(indexActual + i) % sucursalesData.length]);
    }
    return items;
  };

  return (
    <section id="sucursales" className="sucursales-section">
      <h1 className="section-title">Nuestras Sucursales</h1>
      
      <div className="sucursales-grid">
        {getVisibleItems().map((sucursal) => {
          const idUnico = sucursal.id || sucursal._id;
          const semilla = generarSemillaNumerica(idUnico);

          return (
            <div key={idUnico} className="grid-item">
              <SucursalCard  
                nombre={sucursal.nombre}
                ciudad={sucursal.direccion}
                descripcion={sucursal.descripcion || "Auténtica comida italiana."}
                /* Ahora el lock recibe un número real generado desde el ID */
                imagen={`https://loremflickr.com/600/400/restaurant/all?lock=${semilla}`}
              />
            </div>
          );
        })}
      </div>

      <button className="inicio-boton"
      onClick={() => navigate("/explorar")} >
          Encontrar sucursal
        </button>
    </section>
  );
};