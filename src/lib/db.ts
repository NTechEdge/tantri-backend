import mongoose from 'mongoose';

let connected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (connected && mongoose.connection.readyState === 1) return mongoose;
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tantri';
  await mongoose.connect(uri);
  connected = true;
  return mongoose;
}
