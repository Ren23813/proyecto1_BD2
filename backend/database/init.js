use (Proyecto1);


db.createCollection("usuarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "email", "roles", "fechaRegistro", "activo"],
      properties: {
        nombre: { bsonType: "string" },
        email: { bsonType: "string" },
        roles: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        fechaRegistro: { bsonType: "date" },
        activo: { bsonType: "bool" },
        nit: { bsonType: "int" }
      }
    }
  }
})

db.usuarios.createIndex({ email: 1 }, { unique: true })
db.usuarios.createIndex({ roles: 1 })


db.createCollection("restaurantes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "ubicacion", "categoria", "direccion", "activo"],
      properties: {
        nombre: { bsonType: "string" },
        direccion: { bsonType: "string" },
        telefono: { bsonType: "string" },
        calificacionPromedio: { bsonType: "double" },
        totalResenas: { bsonType: "int" },
        activo: { bsonType: "bool" },
        fechaRegistro: { bsonType: "date" },
        categoria: { 
          bsonType: "array", 
          items: { bsonType: "string" }
        },
        ubicacion: {
          bsonType: "object",
          required: ["type", "coordinates"],
          properties: {
            type: { enum: ["Point"] },
            coordinates: {
              bsonType: "array",
              minItems: 2,
              maxItems: 2,
              items: { bsonType: "double" }
            }
          }
        }
      }
    }
  }
})

db.restaurantes.createIndex({ ubicacion: "2dsphere" })
db.restaurantes.createIndex({ nombre: "text", descripcion: "text" })


db.createCollection("articulosMenu", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["restauranteId", "nombre", "precio", "categoria"],
      properties: {
        restauranteId: { bsonType: "objectId" },
        nombre: { bsonType: "string" },
        descripcion: { bsonType: "string" },
        precio: { bsonType: "double" },
        categoria: { bsonType: "string" },
        ingredientes: {
          bsonType: "array",
          items: { bsonType: "object" }
        },
        disponible: { bsonType: "bool" },
        fechaCreacion: { bsonType: "date" },
        imagen: { bsonType: "string" }
      }
    }
  }
})

db.articulosMenu.createIndex({ restauranteId: 1 })
db.articulosMenu.createIndex({ nombre: "text", descripcion: "text" })
db.articulosMenu.createIndex({ restauranteId: 1, categoria: 1 })


db.createCollection("ordenes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuarioId", "restauranteId", "items", "total", "estado", "fechaPedido"],
      properties: {
        usuarioId: { bsonType: "objectId" },
        restauranteId: { bsonType: "objectId" },
        items: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["articuloId", "cantidad", "precioUnitario"],
            properties: {
              articuloId: { bsonType: "objectId" },
              cantidad: { bsonType: "int" },
              precioUnitario: { bsonType: "double" }
            }
          }
        },
        total: { bsonType: "double" },
        estado: { bsonType: "string" },
        metodoPago: { bsonType: "string" },
        tipoOrden: { bsonType: "string" },
        fechaPedido: { bsonType: "date" }
      }
    }
  }
})

db.ordenes.createIndex({ estado: 1 })
db.ordenes.createIndex({ usuarioId: 1, fechaPedido: 1 })
db.ordenes.createIndex({ "items.articuloId": 1 })


db.createCollection("resenas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["restauranteId", "usuarioId", "calificacion", "fecha"],
      properties: {
        restauranteId: { bsonType: "objectId" },
        usuarioId: { bsonType: "objectId" },
        ordenId: { bsonType: "objectId" },
        calificacion: { bsonType: "int", minimum: 1, maximum: 5 },
        comentario: { bsonType: "string" },
        fecha: { bsonType: "date" }
      }
    }
  }
})

db.resenas.createIndex({ restauranteId: 1, calificacion: -1 })
db.resenas.createIndex({ comentario: "text" })


db.createCollection("ingredientes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["restauranteId", "nombre", "cantidadDisponible"],
      properties: {
        restauranteId: { bsonType: "objectId" },
        nombre: { bsonType: "string" },
        proveedor: { bsonType: "string" },
        cantidadDisponible: { bsonType: "double" },
        unidadMedida: { bsonType: "string" },
        costoUnitario: { bsonType: "double" },
        fechaCompra: { bsonType: "date" }
      }
    }
  }
})

db.ingredientes.createIndex({ restauranteId: 1 })
db.ingredientes.createIndex({ nombre: 1 })