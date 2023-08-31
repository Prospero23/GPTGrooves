import { MongoClient, ServerApiVersion } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("Ping API invoked.");

  const uri = process.env.ATLAS_CLUSTER_URI;

  if (uri === undefined) {
    throw new Error("Environment variable ATLAS_CLUSTER_URI is not set!");
  }

  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  pingDatabase(client).catch(console.dir);

  return NextResponse.json({ message: "Sent." });
}
const pingDatabase = async (client: MongoClient) => {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
};
