# proyecto1_BD2

# 🍽️ Sistema de Gestión de Restaurantes — BD2 Proyecto 1

Sistema fullstack para la administración de una cadena de restaurantes. Permite gestionar sedes, usuarios, menú, ingredientes y órdenes en tiempo real, con soporte para múltiples roles y control de inventario automático por transacción.

## Tecnologías

| Capa | Stack |
|------|-------|
| Frontend | React + Vite, CSS modular |
| Backend | Python · FastAPI · Motor (async MongoDB) |
| Base de datos | MongoDB (colecciones + GridFS) |
| Infraestructura | Docker · Docker Compose |

---

## Estructura del repositorio

```
proyecto1_BD2/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── db.py                  # Conexión Motor + GridFS
│   │   └── routers/
│   │       ├── restaurantes.py
│   │       ├── usuarios.py
│   │       ├── ingredientes.py
│   │       ├── articulosMenu.py
│   │       └── ordenes.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       └── components/
│           ├── Ingredientes/
│           ├── Usuarios/
│           ├── RegistroOrdenes/
│           └── ...
├── docker-compose.yml
└── README.md
```

---

## Requisitos previos

- [Docker](https://www.docker.com/) y Docker Compose instalados
- O bien: Python 3.10+, Node.js 18+ y una instancia de MongoDB accesible

---

## Instalación y ejecución

### Con Docker (recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Ren23813/proyecto1_BD2.git
cd proyecto1_BD2

# 2. Levantar todos los servicios
docker compose up --build
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000 |
| Docs interactivos | http://localhost:8000/docs |

---

## Colecciones MongoDB

| Colección | Descripción |
|-----------|-------------|
| `restaurantes` | Sedes de la cadena |
| `usuarios` | Clientes y administradores |
| `articulosMenu` | Platos con precio, disponibilidad e ingredientes asociados |
| `ingredientes` | Inventario por sede |
| `ordenes` | Pedidos con items, total, estado y método de pago |

**Índices recomendados** (ejecutar una vez al inicializar):

```python
await db["ingredientes"].create_index("nombre")
await db["ingredientes"].create_index("restauranteId")
await db["ingredientes"].create_index("cantidadDisponible")

await db["usuarios"].create_index("email", unique=True)
await db["usuarios"].create_index("activo")
await db["usuarios"].create_index("roles")

await db["ordenes"].create_index("fechaPedido")
await db["ordenes"].create_index("estado")
await db["ordenes"].create_index("usuarioId")
```

---

## API — Endpoints principales

### Restaurantes · `/restaurantes`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar todas las sedes |
| POST | `/` | Crear sede |
| PUT | `/{id}` | Actualizar sede |
| DELETE | `/{id}` | Eliminar sede |

### Usuarios · `/usuarios`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar usuarios (paginado) · `?page=1&page_size=50&q=nombre&rol=admin&activo=true` |
| POST | `/` | Crear usuario |
| PUT | `/{id}` | Actualizar usuario |
| DELETE | `/{id}` | Desactivar usuario (soft delete) |
| GET | `/count/activos` | Total de usuarios activos |
| GET | `/reportes/top-gastadores` | Ranking de clientes por gasto |

### Ingredientes · `/ingredientes`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar ingredientes (paginado) · `?page=1&page_size=50&q=busqueda&restaurante_id=X&orden=nombre` |
| POST | `/` | Crear ingrediente |
| PUT | `/{id}` | Actualizar ingrediente |
| DELETE | `/{id}` | Eliminar ingrediente |
| POST | `/registrar-compra` | Registrar compra (incrementa stock en transacción) |

### Órdenes · `/ordenes`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar órdenes (paginado) · `?skip=0&limit=10&estado=Pendiente&restaurante_id=X&usuario_id=Y` |
| POST | `` | Crear orden (valida stock, descuenta inventario en transacción) |
| PUT | `/{id}` | Actualizar estado, método de pago o tipo de entrega |
| DELETE | `/{id}` | Cancelar orden (soft delete) |
| PUT | `/completar-pendientes` | Marcar todas las órdenes pendientes como completadas |
| GET | `/reportes/ventas-por-mes` | Agrupación de ventas por mes |
| POST | `/subir-reporte` | Subir archivo a GridFS |
| GET | `/archivo/{file_id}` | Descargar archivo desde GridFS |

---

## Funcionalidades destacadas

### Control de inventario transaccional
Al crear una orden, el sistema ejecuta una **transacción MongoDB** que valida la disponibilidad de cada ingrediente y descuenta las cantidades necesarias de forma atómica. Si cualquier ingrediente no tiene stock suficiente, la transacción completa se revierte.

### Paginación server-side
Todos los endpoints de listado soportan paginación real en el servidor. El frontend nunca carga más de 50 registros a la vez, lo que permite manejar colecciones de miles de documentos sin degradación de rendimiento.

### Búsqueda con debounce
Los campos de búsqueda del frontend esperan 400 ms tras el último keystroke antes de disparar el fetch, evitando requests innecesarios mientras el usuario escribe.

### Roles y vistas diferenciadas
El componente `AdminContext` controla qué acciones y vistas se muestran según el rol del usuario (`isAdmin`). La vista de cliente permite consultar pedidos por NIT sin exponer información de otros usuarios.

### Almacenamiento de archivos con GridFS
Los reportes y archivos adjuntos se guardan directamente en MongoDB mediante GridFS, con endpoints para subida y descarga en streaming.

---

## Variables de entorno

Crea un archivo `.env` en `backend/` si necesitas sobreescribir los valores por defecto:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=restaurantes_db
```

