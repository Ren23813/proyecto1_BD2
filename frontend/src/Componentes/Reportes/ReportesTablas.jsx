import { useState, useEffect } from "react";

const API_URL = "http://localhost:8000";

export const ReportesTablas = () => {
  const [datos, setDatos] = useState([]);
  const [reporteActivo, setReporteActivo] = useState("mas-vendidos");
  const [loading, setLoading] = useState(false);

  const reportesConfig = {
    "mas-vendidos": { titulo: "Platillos Más Vendidos", endpoint: "/articulosMenu/reportes/mas-vendidos" },
    "ventas-mes": { titulo: "Ventas por Mes", endpoint: "/ordenes/reportes/ventas-por-mes" },
    "top-gastadores": { titulo: "Clientes Estrella", endpoint: "/usuarios/reportes/top-gastadores" },
    "top-ingresos": { titulo: "Sedes con Más Ingresos", endpoint: "/restaurantes/reportes/top-ingresos" },
  };

  useEffect(() => {
    fetchReporte();
  }, [reporteActivo]);

  const fetchReporte = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}${reportesConfig[reporteActivo].endpoint}`);
      const data = await response.json();
      setDatos(data);
    } catch (error) {
      console.error("Error cargando reporte:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resena-card-dashed" style={{ padding: '20px', backgroundColor: 'white', marginTop: '20px' }}>
      <h3 style={{ color: '#8b0000', textAlign: 'center' }}>{reportesConfig[reporteActivo].titulo}</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
        {Object.keys(reportesConfig).map((key) => (
          <button 
            key={key}
            onClick={() => setReporteActivo(key)}
            className="inicio-boton"
            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
          >
            {reportesConfig[key].titulo.split(' ')[0]} {/* Simplificamos el nombre */}
          </button>
        ))}
      </div>

      {loading ? <p>Procesando Aggregation Pipeline...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #324f5c' }}>
              {datos.length > 0 && Object.keys(datos[0]).map(key => (
                <th key={key} style={{ padding: '10px', textAlign: 'left', textTransform: 'capitalize' }}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((fila, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                {Object.values(fila).map((val, j) => (
                  <td key={j} style={{ padding: '10px' }}>
                    {typeof val === 'number' && val > 1000 ? `$${val.toLocaleString()}` : val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};