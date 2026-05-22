// =============================================================
// LABORATORIO MONGODB - Datos de Muestra
// Ejecutar en: mongosh < 01_setup_datos.js
// O pegar directamente en mongosh
// =============================================================

use("tienda_online");

// ── LIMPIAR colecciones previas ─────────────────────────────
db.clientes.drop();
db.productos.drop();
db.pedidos.drop();
db.resenas.drop();

print("✅ Colecciones anteriores eliminadas");

// ── 1. CLIENTES ─────────────────────────────────────────────
db.clientes.insertMany([
  {
    _id: ObjectId("64a1000000000000000001"),
    nombre: "Ana García",
    email: "ana.garcia@email.com",
    edad: 28,
    ciudad: "Buenos Aires",
    pais: "Argentina",
    plan: "premium",
    saldo_fidelidad: 1250,
    fecha_registro: new Date("2021-03-15"),
    activo: true,
    preferencias: {
      categorias: ["electrónica", "libros"],
      notificaciones: true,
      idioma: "es"
    },
    historial_pagos: ["tarjeta", "transferencia"]
  },
  {
    _id: ObjectId("64a1000000000000000002"),
    nombre: "Carlos López",
    email: "carlos.lopez@email.com",
    edad: 35,
    ciudad: "Córdoba",
    pais: "Argentina",
    plan: "basico",
    saldo_fidelidad: 320,
    fecha_registro: new Date("2022-07-10"),
    activo: true,
    preferencias: {
      categorias: ["deportes", "ropa"],
      notificaciones: false,
      idioma: "es"
    },
    historial_pagos: ["tarjeta"]
  },
  {
    _id: ObjectId("64a1000000000000000003"),
    nombre: "María Fernández",
    email: "maria.f@email.com",
    edad: 42,
    ciudad: "Rosario",
    pais: "Argentina",
    plan: "premium",
    saldo_fidelidad: 4800,
    fecha_registro: new Date("2020-11-05"),
    activo: true,
    preferencias: {
      categorias: ["hogar", "electrónica", "jardín"],
      notificaciones: true,
      idioma: "es"
    },
    historial_pagos: ["tarjeta", "mercadopago", "efectivo"]
  },
  {
    _id: ObjectId("64a1000000000000000004"),
    nombre: "Pedro Ramírez",
    email: "pedro.r@email.com",
    edad: 19,
    ciudad: "Mendoza",
    pais: "Argentina",
    plan: "basico",
    saldo_fidelidad: 85,
    fecha_registro: new Date("2023-01-20"),
    activo: false,
    preferencias: {
      categorias: ["videojuegos"],
      notificaciones: true,
      idioma: "es"
    },
    historial_pagos: ["tarjeta"]
  },
  {
    _id: ObjectId("64a1000000000000000005"),
    nombre: "Lucía Martínez",
    email: "lucia.mtz@email.com",
    edad: 31,
    ciudad: "Ciudad de México",
    pais: "México",
    plan: "enterprise",
    saldo_fidelidad: 9200,
    fecha_registro: new Date("2019-06-28"),
    activo: true,
    preferencias: {
      categorias: ["electrónica", "libros", "deportes"],
      notificaciones: true,
      idioma: "es"
    },
    historial_pagos: ["tarjeta", "paypal", "transferencia"]
  },
  {
    _id: ObjectId("64a1000000000000000006"),
    nombre: "Javier Torres",
    email: "javi.torres@email.com",
    edad: 55,
    ciudad: "Madrid",
    pais: "España",
    plan: "premium",
    saldo_fidelidad: 2100,
    fecha_registro: new Date("2020-02-14"),
    activo: true,
    preferencias: {
      categorias: ["libros", "hogar"],
      notificaciones: false,
      idioma: "es"
    },
    historial_pagos: ["transferencia", "tarjeta"]
  }
]);

print("✅ 6 clientes insertados");

// ── 2. PRODUCTOS ─────────────────────────────────────────────
db.productos.insertMany([
  {
    _id: ObjectId("64a2000000000000000001"),
    nombre: "Laptop Pro 15",
    categoria: "electrónica",
    subcategoria: "computadoras",
    precio: 1299.99,
    stock: 45,
    marca: "TechBrand",
    especificaciones: {
      ram: "16GB",
      almacenamiento: "512GB SSD",
      pantalla: "15.6 pulgadas",
      procesador: "Intel i7"
    },
    tags: ["laptop", "trabajo", "gaming"],
    calificacion_promedio: 4.5,
    total_vendidos: 892,
    fecha_alta: new Date("2022-01-10"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000002"),
    nombre: "Smartphone X12",
    categoria: "electrónica",
    subcategoria: "celulares",
    precio: 699.99,
    stock: 120,
    marca: "MobileCo",
    especificaciones: {
      ram: "8GB",
      almacenamiento: "256GB",
      pantalla: "6.1 pulgadas",
      bateria: "4500mAh"
    },
    tags: ["smartphone", "android", "5g"],
    calificacion_promedio: 4.2,
    total_vendidos: 2341,
    fecha_alta: new Date("2022-06-15"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000003"),
    nombre: "Zapatillas Runner Elite",
    categoria: "deportes",
    subcategoria: "calzado",
    precio: 129.99,
    stock: 200,
    marca: "SportZone",
    especificaciones: {
      material: "mesh transpirable",
      suela: "goma EVA",
      uso: "running"
    },
    tags: ["running", "deportes", "zapatillas"],
    calificacion_promedio: 4.7,
    total_vendidos: 5610,
    fecha_alta: new Date("2021-09-01"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000004"),
    nombre: "Cafetera Espresso Pro",
    categoria: "hogar",
    subcategoria: "cocina",
    precio: 349.99,
    stock: 30,
    marca: "CaféMaster",
    especificaciones: {
      presion: "15 bares",
      deposito: "1.5L",
      potencia: "1400W"
    },
    tags: ["café", "cocina", "hogar"],
    calificacion_promedio: 4.8,
    total_vendidos: 1234,
    fecha_alta: new Date("2022-03-22"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000005"),
    nombre: "Auriculares BT Pro",
    categoria: "electrónica",
    subcategoria: "audio",
    precio: 189.99,
    stock: 0,
    marca: "SoundMax",
    especificaciones: {
      conectividad: "Bluetooth 5.2",
      bateria: "30 horas",
      cancelacion_ruido: true
    },
    tags: ["audio", "bluetooth", "inalámbrico"],
    calificacion_promedio: 4.3,
    total_vendidos: 3421,
    fecha_alta: new Date("2021-12-05"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000006"),
    nombre: "Python para Ciencia de Datos",
    categoria: "libros",
    subcategoria: "programación",
    precio: 49.99,
    stock: 500,
    marca: "Editorial Tech",
    especificaciones: {
      paginas: 450,
      idioma: "Español",
      edicion: "3ra"
    },
    tags: ["python", "data science", "programación"],
    calificacion_promedio: 4.9,
    total_vendidos: 8900,
    fecha_alta: new Date("2023-02-01"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000007"),
    nombre: "Monitor 4K UltraWide",
    categoria: "electrónica",
    subcategoria: "monitores",
    precio: 599.99,
    stock: 18,
    marca: "VisualPro",
    especificaciones: {
      resolucion: "3840x2160",
      tamano: "34 pulgadas",
      frecuencia: "144Hz",
      panel: "IPS"
    },
    tags: ["monitor", "4k", "gaming", "trabajo"],
    calificacion_promedio: 4.6,
    total_vendidos: 432,
    fecha_alta: new Date("2023-04-10"),
    activo: true
  },
  {
    _id: ObjectId("64a2000000000000000008"),
    nombre: "Camiseta Deportiva Dry-Fit",
    categoria: "deportes",
    subcategoria: "ropa",
    precio: 29.99,
    stock: 350,
    marca: "SportZone",
    especificaciones: {
      material: "100% poliéster",
      tecnologia: "Dry-Fit",
      colores: ["negro", "azul", "rojo", "blanco"]
    },
    tags: ["ropa", "deportes", "transpirable"],
    calificacion_promedio: 4.1,
    total_vendidos: 12000,
    fecha_alta: new Date("2021-05-15"),
    activo: false
  }
]);

print("✅ 8 productos insertados");

// ── 3. PEDIDOS ───────────────────────────────────────────────
db.pedidos.insertMany([
  {
    _id: ObjectId("64a3000000000000000001"),
    numero: "PED-2024-001",
    cliente_id: ObjectId("64a1000000000000000001"),
    cliente_nombre: "Ana García",
    fecha: new Date("2024-01-10T14:30:00"),
    estado: "entregado",
    items: [
      { producto_id: ObjectId("64a2000000000000000001"), nombre: "Laptop Pro 15", cantidad: 1, precio_unitario: 1299.99 },
      { producto_id: ObjectId("64a2000000000000000005"), nombre: "Auriculares BT Pro", cantidad: 1, precio_unitario: 189.99 }
    ],
    subtotal: 1489.98,
    descuento: 74.50,
    total: 1415.48,
    metodo_pago: "tarjeta",
    envio: { tipo: "express", costo: 15.00, direccion: "Av. Corrientes 1234, CABA" }
  },
  {
    _id: ObjectId("64a3000000000000000002"),
    numero: "PED-2024-002",
    cliente_id: ObjectId("64a1000000000000000003"),
    cliente_nombre: "María Fernández",
    fecha: new Date("2024-01-15T09:00:00"),
    estado: "entregado",
    items: [
      { producto_id: ObjectId("64a2000000000000000004"), nombre: "Cafetera Espresso Pro", cantidad: 1, precio_unitario: 349.99 },
      { producto_id: ObjectId("64a2000000000000000006"), nombre: "Python para Ciencia de Datos", cantidad: 2, precio_unitario: 49.99 }
    ],
    subtotal: 449.97,
    descuento: 0,
    total: 449.97,
    metodo_pago: "mercadopago",
    envio: { tipo: "standard", costo: 8.00, direccion: "San Martín 500, Rosario" }
  },
  {
    _id: ObjectId("64a3000000000000000003"),
    numero: "PED-2024-003",
    cliente_id: ObjectId("64a1000000000000000005"),
    cliente_nombre: "Lucía Martínez",
    fecha: new Date("2024-02-01T18:45:00"),
    estado: "en_camino",
    items: [
      { producto_id: ObjectId("64a2000000000000000002"), nombre: "Smartphone X12", cantidad: 2, precio_unitario: 699.99 },
      { producto_id: ObjectId("64a2000000000000000007"), nombre: "Monitor 4K UltraWide", cantidad: 1, precio_unitario: 599.99 }
    ],
    subtotal: 1999.97,
    descuento: 200.00,
    total: 1799.97,
    metodo_pago: "paypal",
    envio: { tipo: "express", costo: 25.00, direccion: "Reforma 2000, CDMX" }
  },
  {
    _id: ObjectId("64a3000000000000000004"),
    numero: "PED-2024-004",
    cliente_id: ObjectId("64a1000000000000000002"),
    cliente_nombre: "Carlos López",
    fecha: new Date("2024-02-10T11:20:00"),
    estado: "pendiente",
    items: [
      { producto_id: ObjectId("64a2000000000000000003"), nombre: "Zapatillas Runner Elite", cantidad: 1, precio_unitario: 129.99 },
      { producto_id: ObjectId("64a2000000000000000008"), nombre: "Camiseta Deportiva", cantidad: 3, precio_unitario: 29.99 }
    ],
    subtotal: 219.96,
    descuento: 10.00,
    total: 209.96,
    metodo_pago: "tarjeta",
    envio: { tipo: "standard", costo: 5.00, direccion: "Bv. San Juan 1000, Córdoba" }
  },
  {
    _id: ObjectId("64a3000000000000000005"),
    numero: "PED-2024-005",
    cliente_id: ObjectId("64a1000000000000000001"),
    cliente_nombre: "Ana García",
    fecha: new Date("2024-03-05T16:00:00"),
    estado: "entregado",
    items: [
      { producto_id: ObjectId("64a2000000000000000006"), nombre: "Python para Ciencia de Datos", cantidad: 1, precio_unitario: 49.99 }
    ],
    subtotal: 49.99,
    descuento: 0,
    total: 49.99,
    metodo_pago: "tarjeta",
    envio: { tipo: "digital", costo: 0, direccion: "N/A" }
  },
  {
    _id: ObjectId("64a3000000000000000006"),
    numero: "PED-2024-006",
    cliente_id: ObjectId("64a1000000000000000006"),
    cliente_nombre: "Javier Torres",
    fecha: new Date("2024-03-12T10:30:00"),
    estado: "cancelado",
    items: [
      { producto_id: ObjectId("64a2000000000000000001"), nombre: "Laptop Pro 15", cantidad: 1, precio_unitario: 1299.99 }
    ],
    subtotal: 1299.99,
    descuento: 0,
    total: 1299.99,
    metodo_pago: "transferencia",
    envio: { tipo: "express", costo: 30.00, direccion: "Gran Vía 50, Madrid" }
  }
]);

print("✅ 6 pedidos insertados");

// ── 4. RESEÑAS ────────────────────────────────────────────────
db.resenas.insertMany([
  {
    producto_id: ObjectId("64a2000000000000000001"),
    cliente_id: ObjectId("64a1000000000000000001"),
    calificacion: 5,
    titulo: "Excelente laptop para trabajo",
    comentario: "Muy rápida, la batería dura todo el día. La recomiendo totalmente.",
    fecha: new Date("2024-01-25"),
    util: 42
  },
  {
    producto_id: ObjectId("64a2000000000000000001"),
    cliente_id: ObjectId("64a1000000000000000005"),
    calificacion: 4,
    titulo: "Buena pero cara",
    comentario: "Rendimiento excelente, pero el precio es elevado. El soporte técnico es bueno.",
    fecha: new Date("2024-02-15"),
    util: 18
  },
  {
    producto_id: ObjectId("64a2000000000000000004"),
    cliente_id: ObjectId("64a1000000000000000003"),
    calificacion: 5,
    titulo: "El mejor café que tomé",
    comentario: "La cafetera hace un espresso perfecto. Vale cada centavo.",
    fecha: new Date("2024-01-30"),
    util: 67
  },
  {
    producto_id: ObjectId("64a2000000000000000006"),
    cliente_id: ObjectId("64a1000000000000000001"),
    calificacion: 5,
    titulo: "Imprescindible para Data Science",
    comentario: "Clarísimo, con ejemplos prácticos. El mejor libro de Python que leí.",
    fecha: new Date("2024-03-10"),
    util: 95
  }
]);

print("✅ 4 reseñas insertadas");

// ── ÍNDICES recomendados ──────────────────────────────────────
db.clientes.createIndex({ email: 1 }, { unique: true });
db.clientes.createIndex({ ciudad: 1, plan: 1 });
db.productos.createIndex({ categoria: 1, precio: 1 });
db.productos.createIndex({ tags: 1 });
db.pedidos.createIndex({ cliente_id: 1, fecha: -1 });
db.pedidos.createIndex({ estado: 1 });

print("✅ Índices creados");
print("");
print("════════════════════════════════════════");
print("  BASE DE DATOS lista para el laboratorio");
print("  Colección: tienda_online");
print("  Documentos: clientes(6) productos(8) pedidos(6) resenas(4)");
print("════════════════════════════════════════");
