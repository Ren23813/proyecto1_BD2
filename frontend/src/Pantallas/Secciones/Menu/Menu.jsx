import { useEffect, useState } from "react";

import "./Menu.css";
import { MenuItem } from "../../../Componentes/MenuItem/MenuItem";

export const Menu = () => {

  const menuData = [
    { id: 1, nombre: "Pizza Margherita", descripcion: "Clásica italiana.", imagen: "https://picsum.photos/400?random=1" },
    { id: 2, nombre: "Carbonara", descripcion: "Pasta cremosa romana.", imagen: "https://picsum.photos/400?random=2" },
    { id: 3, nombre: "Lasagna", descripcion: "Tradicional boloñesa.", imagen: "https://picsum.photos/400?random=3" },
    { id: 4, nombre: "Risotto", descripcion: "Cremoso y elegante.", imagen: "https://picsum.photos/400?random=4" },
    { id: 5, nombre: "Tiramisú", descripcion: "Postre clásico.", imagen: "https://picsum.photos/400?random=5" },
    { id: 6, nombre: "Bruschetta", descripcion: "Entrada italiana.", imagen: "https://picsum.photos/400?random=6" },
    { id: 7, nombre: "Focaccia", descripcion: "Pan artesanal.", imagen: "https://picsum.photos/400?random=7" },
    { id: 8, nombre: "Gnocchi", descripcion: "Suaves y caseros.", imagen: "https://picsum.photos/400?random=8" },
    { id: 9, nombre: "Ravioli", descripcion: "Rellenos frescos.", imagen: "https://picsum.photos/400?random=9" },
    { id: 10, nombre: "Panna Cotta", descripcion: "Postre delicado.", imagen: "https://picsum.photos/400?random=10" },
    { id: 11, nombre: "Calzone", descripcion: "Pizza cerrada.", imagen: "https://picsum.photos/400?random=11" },
    { id: 12, nombre: "Caprese", descripcion: "Tomate y mozzarella.", imagen: "https://picsum.photos/400?random=12" }
  ];

  const itemsPorPagina = 6;
  const [paginaActual, setPaginaActual] = useState(0);

  const totalPaginas = Math.ceil(menuData.length / itemsPorPagina);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setPaginaActual((prev) =>
        prev === totalPaginas - 1 ? 0 : prev + 1
      );
    }, 3000); // 3 segundos

    return () => clearInterval(intervalo);
  }, [totalPaginas]);

  const inicio = paginaActual * itemsPorPagina;
  const fin = inicio + itemsPorPagina;
  const itemsVisibles = menuData.slice(inicio, fin);

  return (
    <section id="menu" className="menu-section">
      <h1>Nuestro Menú</h1>
      

      <div className="menu-grid">
        {itemsVisibles.map((item) => (
          <MenuItem key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
};