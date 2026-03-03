import "./MenuItem.css";

export const MenuItem = ({ nombre, descripcion, imagen }) => {
  return (
    <div className="menu-item">
      
      <div className="rombo-container">
        <div className="rombo">
          <img src={imagen} alt={nombre} />
        </div>
      </div>

      <h3>{nombre}</h3>
      <p>{descripcion}</p>

      <button className="ver-mas">Ver más</button>
    </div>
  );
};