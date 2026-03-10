import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Configuración de iconos usando CDNs para evitar errores de ruta local en Vite
const iconResaurante = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export const MapaSucursales = ({ sucursales, alHacerClickEnMapa }) => {
  
  // Capturador de clics
  const ManejadorClicks = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        if (alHacerClickEnMapa) {
          alHacerClickEnMapa(lat, lng);
        }
      },
    });
    return null;
  };

  return (
    <div style={{ height: "500px", width: "100%", position: "relative" }}>
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <ManejadorClicks />

        {sucursales && sucursales.map((sucursal) => (
          <Marker 
            key={sucursal.id || sucursal._id} 
            position={[
              sucursal.ubicacion.coordinates[1], // Latitud
              sucursal.ubicacion.coordinates[0]  // Longitud
            ]}
            icon={iconResaurante}
          >
            <Popup>
              <strong>{sucursal.nombre}</strong> <br />
              {sucursal.direccion}
            </Popup>
          </Marker>
        ))}

      </MapContainer>
       
    </div>
  );
};