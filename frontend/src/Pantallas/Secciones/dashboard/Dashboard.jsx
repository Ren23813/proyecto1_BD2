import { GestorArchivos } from "../../../Componentes/Reportes/GestorArchivos";
import { ReportesTablas } from "../../../Componentes/Reportes/ReportesTablas";
import "./Dashboard.css";

export const Dashboard = () => {
  // Pega aquí tus 3 links de Mongo
  const chartLinks = [
    "https://charts.mongodb.com/charts-lab01-zjcmamv/embed/charts?id=fa6b7b58-7591-4b56-b5bc-880aea8246c4&maxDataAge=14400&theme=light&autoRefresh=true",
    "https://charts.mongodb.com/charts-lab01-zjcmamv/embed/charts?id=ae4ac840-a987-4061-84d6-857c6f980e31&maxDataAge=14400&theme=light&autoRefresh=true",
    "https://charts.mongodb.com/charts-lab01-zjcmamv/embed/charts?id=8e7ec731-40a0-4731-b125-d7d25ce3fb96&maxDataAge=14400&theme=light&autoRefresh=true"
  ];

  return (
    <div className="dashboard-container">
      <h1 className="section-title">Panel de Administración</h1>
      
      <div className="stats-grid">
        {chartLinks.map((link, index) => (
          <div key={index} className="chart-card">
            <div className="resena-card-dashed"> {/* Reutilizamos tu clase de bordes */}
              <iframe
                title={`Grafica ${index}`}
                className="mongo-chart"
                src={link}
              ></iframe>
            </div>
          </div>
        ))}
      </div>

     

      <hr style={{ border: '1px dashed #324f5c', margin: '40px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <ReportesTablas />
       
        <GestorArchivos />
      </div>
    </div>
  );
};