// =============================================================
// LABORATORIO MONGODB — Demo API Externa
// Consume Open Library API (gratis, sin auth)
// Inserta libros de MongoDB en nuestra colección
// =============================================================
// Ejecutar: node 03_api_externa.js
// Requiere: npm install mongodb
//
// ─── CONFIGURÁ TU URI ────────────────────────────────────────
// Opción A (local):    node 03_api_externa.js
// Opción B (Atlas):    MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority" node 03_api_externa.js
// Opción C (Atlas):    editá MONGO_URI abajo con tu string de conexión
// =============================================================

const { MongoClient } = require("mongodb");

// Leé la URI desde variable de entorno, o cambiá el string de abajo
const MONGO_URI = "ACA VA LA CADENA DE CONE";
const DB_NAME   = "tienda_online";

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

async function fetchLibrosDesdeAPI() {
  console.log("🌐 Consultando Open Library API...");

  // API pública de Open Library — búsqueda por tema
  const url = "https://openlibrary.org/search.json?subject=mongodb&limit=8&fields=title,author_name,first_publish_year,isbn,number_of_pages_median,ratings_average,ratings_count";

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();

  console.log(`✅ API respondió: ${data.numFound} libros encontrados, mostrando ${data.docs.length}`);
  return data.docs;
}

function mapearLibroAProducto(libro) {
  return {
    nombre: libro.title || "Sin título",
    categoria: "libros",
    subcategoria: "bases-de-datos",
    precio: +(Math.random() * 40 + 25).toFixed(2),
    stock: Math.floor(Math.random() * 200 + 50),
    marca: "Open Library Import",
    fuente: "open_library_api",
    especificaciones: {
      autor: libro.author_name ? libro.author_name.join(", ") : "Desconocido",
      anio_publicacion: libro.first_publish_year || null,
      paginas: libro.number_of_pages_median || null,
      isbn: libro.isbn ? libro.isbn[0] : null
    },
    tags: ["mongodb", "bases-de-datos", "nosql", "programación"],
    calificacion_promedio: libro.ratings_average
      ? +libro.ratings_average.toFixed(1)
      : +(Math.random() * 2 + 3).toFixed(1),
    total_resenas: libro.ratings_count || 0,
    total_vendidos: 0,
    fecha_alta: new Date(),
    activo: true,
    importado_api: true
  };
}

async function main() {
  console.log(`🔌 Conectando a: ${MONGO_URI.replace(/:([^@]+)@/, ':****@')}`);
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✅ Conectado a MongoDB");

    const db  = client.db(DB_NAME);
    const col = db.collection("productos");

    // 1. Traer libros de la API
    const librosAPI = await fetchLibrosDesdeAPI();

    // 2. Mapear al esquema de productos
    const productosNuevos = librosAPI.map(mapearLibroAProducto);

    // 3. Mostrar en consola los datos recibidos
    console.log("\n📚 Libros obtenidos de la API:");
    productosNuevos.forEach((p, i) => {
      console.log(`  ${i + 1}. "${p.nombre}" (${p.especificaciones.anio_publicacion || "?"}) — $${p.precio}`);
    });

    // 4. Insertar en MongoDB
    const resultado = await col.insertMany(productosNuevos, { ordered: false });
    console.log(`\n✅ ${resultado.insertedCount} libros importados a MongoDB`);

    // 5. Verificar con una aggregation
    console.log("\n📊 Resumen productos importados:");
    const resumen = await col.aggregate([
      { $match: { importado_api: true } },
      {
        $group: {
          _id: null,
          cantidad: { $sum: 1 },
          precio_prom: { $avg: "$precio" },
          calificacion_prom: { $avg: "$calificacion_promedio" }
        }
      },
      {
        $project: {
          _id: 0,
          cantidad: 1,
          precio_prom: { $round: ["$precio_prom", 2] },
          calificacion_prom: { $round: ["$calificacion_prom", 1] }
        }
      }
    ]).toArray();
    console.log("  ", resumen[0]);

    // 6. Top 3 por calificación
    console.log("\n🔍 Libros importados con mejor calificación:");
    const top = await col
      .find({ importado_api: true })
      .sort({ calificacion_promedio: -1 })
      .limit(3)
      .project({ nombre: 1, "especificaciones.autor": 1, calificacion_promedio: 1, precio: 1, _id: 0 })
      .toArray();
    top.forEach(l => console.log(`  📖 ${l.nombre} — ⭐ ${l.calificacion_promedio} — $${l.precio}`));

    console.log("\n🎓 Demostración completa:");
    console.log("  1. Consultamos Open Library API (datos reales)");
    console.log("  2. Mapeamos al esquema de nuestra tienda");
    console.log("  3. Insertamos en MongoDB");
    console.log("  4. Ejecutamos aggregations sobre los datos importados");
    console.log("  → Todo esto en < 50 líneas de código Node.js\n");

  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.message.includes("querySrv") || err.message.includes("ECONNREFUSED")) {
      console.error("\n❌ No se pudo conectar a MongoDB.");
      console.error("   Si usás Atlas, ejecutá así:");
      console.error('   MONGO_URI="mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority" node 03_api_externa.js\n');
    } else {
      console.error("❌ Error:", err.message);
    }
  } finally {
    await client.close();
    console.log("🔌 Conexión cerrada");
  }
}

main();