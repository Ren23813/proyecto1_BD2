import { useState } from "react";

export const GestorArchivos = () => {
  const [file, setFile] = useState(null);
  const [lastFileId, setLastFileId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Selecciona un archivo primero");

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ordenes/subir-reporte", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const data = await response.json();
      setLastFileId(data.file_id);
      alert(`✅ Subido con éxito\nNombre: ${data.nombre}\nID: ${data.file_id}`);
    } catch (err) {
      alert(`❌ Error al subir: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    const id = prompt("Ingresa el ID del archivo a descargar:", lastFileId);
    if (!id) return;
    window.open(`http://localhost:8000/ordenes/archivo/${id}`, "_blank");
  };

  return (
    <div className="resena-card-dashed" style={{ padding: "20px", background: "#fdfcf0" }}>
      <h3 style={{ color: "#8b0000" }}>📂 Repositorio de Reportes (GridFS)</h3>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ marginBottom: "10px", display: "block" }}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={handleUpload} className="btn-reset-mapa" disabled={loading}>
          {loading ? "Subiendo..." : "Subir a MongoDB"}
        </button>
        <button
          onClick={handleDownload}
          className="btn-reset-mapa"
          style={{ backgroundColor: "#324f5c" }}
        >
          Descargar Reporte
        </button>
      </div>
      {lastFileId && (
        <p style={{ fontSize: "0.7rem", marginTop: "10px" }}>
          Último ID: <strong>{lastFileId}</strong>
        </p>
      )}
    </div>
  );
};