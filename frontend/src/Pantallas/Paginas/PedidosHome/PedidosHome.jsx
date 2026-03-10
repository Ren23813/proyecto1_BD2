import { useNavigate } from "react-router-dom";
import "./PedidosHome.css";

export const PedidosHome = () => {
  const navigate = useNavigate();

  return (
    <div className="pedidos-hub-container">
      <h1 className="hub-title">Gestión de Pedidos</h1>
      <div className="hub-cards">
        <div className="hub-card" onClick={() => navigate("/pedidos/rastrear")}>
          <div className="card-icon">📍</div>
          <h3>Rastrear Pedidos</h3>
          <p>Consulta el estado de tus órdenes actuales.</p>
        </div>

        <div className="hub-card" onClick={() => navigate("/pedidos/nuevo")}>
          <div className="card-icon">🍕</div>
          <h3>Nuevo Pedido</h3>
          <p>Explora el menú y realiza una compra.</p>
        </div>
      </div>
    </div>
  );
};