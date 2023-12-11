import {
  MongoClient,
  ServerApiVersion,
  type Collection,
  type WithId,
} from "mongodb";
import { type SongRecordType } from "./musicData";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
// import { ObjectId } from "mongodb";

// https://www.mongodb.com/compatibility/using-typescript-with-mongodb-tutorial
export async function getSongs(): Promise<Array<WithId<SongRecordType>>> {
  // Get songs, sorted by date descending

  const atlas_cluster_uri = process.env.ATLAS_CLUSTER_URI;
  const db_name = process.env.DB_NAME;
  const client = new MongoClient(atlas_cluster_uri as string, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const db = client.db(db_name);
    const songsCollection: Collection = db.collection("songs");
    const songs = (await songsCollection.find({}).toArray()) as Array<
      WithId<SongRecordType>
    >;

    console.log({
      atlas_cluster_uri,
      db_name,
      dates: songs
        .sort((a, b) => {
          // Sorted by date descending
          const aDate = new Date(a.created_at_utc);
          const bDate = new Date(b.created_at_utc);
          return bDate.getTime() - aDate.getTime();
        })
        .map((song) => song.created_at_utc),
    });

    return songs.sort((a, b) => {
      // Sorted by date descending
      const aDate = new Date(a.created_at_utc);
      const bDate = new Date(b.created_at_utc);
      return bDate.getTime() - aDate.getTime();
    });
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
