import { createContext, useState, useContext } from "react";

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleAdmin = () => setIsAdmin(!isAdmin);

  return (
    <AdminContext.Provider value={{ isAdmin, setIsAdmin, toggleAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácilmente
export const useAdmin = () => useContext(AdminContext);