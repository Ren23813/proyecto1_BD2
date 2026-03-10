import "./MenuItem.css";

export const MenuItem = ({ nombre, descripcion, precio, imagen }) => {
  return (
    <div className="menu-item-container">
      <div className="menu-item-card">
        <div className="menu-item-imagen">
          <img src={imagen} alt={nombre} />
        </div>

        <div className="menu-item-info">
          <h2>{nombre}</h2>
          <h4 className="precio-tag">${precio.toFixed(2)}</h4>
          <p>{descripcion}</p>

        </div>
      </div>
    </div>
  );
};
