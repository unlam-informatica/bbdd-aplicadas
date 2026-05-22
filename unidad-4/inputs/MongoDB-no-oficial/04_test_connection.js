
const { MongoClient, ServerApiVersion } = require('mongodb');
const MONGO_URI = "aca va la cadena de conexion";
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

//const username = encodeURIComponent("alumnoMartesNoche");
//const password = encodeURIComponent("Lively-Twig8-Repackage");

// Create a MongoClient with a MongoClientOptions object to set the Stable API version

const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 30000,
  serverSelectionTimeoutMS: 30000,
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
