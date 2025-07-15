import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = `mongodb+srv://ujwalshettyr:${process.env.MONGO_PASSWORD}@cluster0.qkkspzc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const mongoClient = new MongoClient(uri);

export async function connectMongo() {
  try {
    await mongoClient.connect(); // idempotent in modern drivers
    return mongoClient;
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    throw err;
  }
} 