import { useNavigate } from "react-router";
import "./Inicio.css"
import { useAdmin } from "../../../AdminContext";
import { Dashboard } from "../dashboard/Dashboard";


export const Inicio = () =>{

  const navigate = useNavigate();
  // 1. Extraemos la variable global
  const { isAdmin } = useAdmin();
  useAdmin

  // 2. Si es Admin, retornamos directamente el Dashboard
  if (isAdmin) {
    return <Dashboard />;
  }

    return(
       
                  
                
      <section id="inicio" className="inicio">
        <section className="inicio1">

            <div className="inicio-contenido">


              {/* 📝 Texto */}
              <div className="inicio-texto">
                <h1>Benvenuti a Sapori d’Italia</h1>

                <p>
                  Desde el corazón de Italia hacia el mundo.  
                  Somos una experiencia gastronómica presente en más de 
                  120 ciudades alrededor del planeta, llevando tradición,
                  pasión y auténtico sabor italiano a cada mesa.
                </p>

                <p>
                  Pastas artesanales, pizzas al horno de leña y recetas
                  transmitidas por generaciones. Cada plato cuenta una historia.
                </p>

            <button className="inicio-boton"
            onClick={() => navigate("/carta-completa")}>
                  Descubrir Menú
                </button>
                
              </div>

              {/* 🖼 Imagen */}
              <div className="inicio-imagen">
                <div className="imagen-placeholder">
                  Imagen del Restaurante
                </div>
                
              </div>
              

            </div>
            

          </section>
          </section>

            

    
    )

}