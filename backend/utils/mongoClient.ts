import { MongoClient } from 'mongodb';

const password = process.env.MONGO_PASSWORD || 'Databasenigga10';
const uri = `mongodb+srv://ujwalshettyr:${encodeURIComponent(password)}@cluster0.qkkspszc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

export const mongoClient = new MongoClient(uri);

export async function connectMongo() {
  if (!mongoClient.topology || !mongoClient.topology.isConnected()) {
    await mongoClient.connect();
    console.log('Connected to MongoDB!');
  }
  return mongoClient;
} 