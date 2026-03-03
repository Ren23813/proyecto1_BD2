import { useEffect, useState } from "react";

import "./Sucursales.css";
import { SucursalCard } from "../../../Componentes/SucursalCard/SucursalCard";

export const Sucursales = () => {

  // 📦 JSON de prueba
  const sucursalesData = [
    {
      id: 1,
      nombre: "Sapori d’Italia Roma",
      ciudad: "Roma",
      pais: "Italia",
      descripcion: "Nuestra casa madre, donde comenzó todo. Tradición pura y recetas originales transmitidas por generaciones.",
      imagen: "https://picsum.photos/600/400?random=1"
    },
    {
      id: 2,
      nombre: "Sapori d’Italia New York",
      ciudad: "New York",
      pais: "Estados Unidos",
      descripcion: "El auténtico sabor italiano en el corazón de Manhattan. Elegancia, modernidad y pasión.",
      imagen: "https://picsum.photos/600/400?random=2"
    },
    {
      id: 3,
      nombre: "Sapori d’Italia Tokyo",
      ciudad: "Tokyo",
      pais: "Japón",
      descripcion: "Una fusión cultural donde Italia se encuentra con la precisión japonesa.",
      imagen: "https://picsum.photos/600/400?random=3"
    },
    {
      id: 4,
      nombre: "Sapori d’Italia Buenos Aires",
      ciudad: "Buenos Aires",
      pais: "Argentina",
      descripcion: "Un homenaje a la herencia italiana en Latinoamérica, con un ambiente cálido y familiar.",
      imagen: "https://picsum.photos/600/400?random=4"
    }
  ];

  const [indexActual, setIndexActual] = useState(0);

  // 🔄 Rotación automática cada 30 segundos
  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndexActual((prev) =>
        prev === sucursalesData.length - 1 ? 0 : prev + 1
      );
    }, 3000); // 30 segundos

    return () => clearInterval(intervalo);
  }, []);

  return (
    <section id="sucursales" className="sucursales">
      <h1>Nuestras Sucursales</h1>

      <SucursalCard {...sucursalesData[indexActual]} />

    </section>
  );
};