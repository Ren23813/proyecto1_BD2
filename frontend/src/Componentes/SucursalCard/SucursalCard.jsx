import "./SucursalCard.css";

export const SucursalCard = ({ nombre, ciudad, pais, descripcion, imagen }) => {
  return (
    <div className="sucursal-card">
      <div className="sucursal-imagen">
        <img src={imagen} alt={nombre} />
      </div>

      <div className="sucursal-info">
        <h2>{nombre}</h2>
        <h4>{ciudad}, {pais}</h4>
        <p>{descripcion}</p>
      </div>
    </div>
  );
};