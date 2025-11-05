import mongoose from "mongoose";

declare global {
  var _mongooseConn: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");

export default async function dbConnect() {
  if (!global._mongooseConn) global._mongooseConn = { conn: null, promise: null };

  if (global._mongooseConn.conn) return global._mongooseConn.conn;

  if (!global._mongooseConn.promise) {
    global._mongooseConn.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then((m) => m);
  }

  global._mongooseConn.conn = await global._mongooseConn.promise;
  return global._mongooseConn.conn;
}