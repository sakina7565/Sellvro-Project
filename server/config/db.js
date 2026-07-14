import mongoose from 'mongoose'

/**
 * Connects to MongoDB Atlas using MONGODB_URI from .env.
 * Exports the mongoose connection for reuse across the app.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to your .env file.')
  }

  const conn = await mongoose.connect(uri)
  console.log(`MongoDB connected: ${conn.connection.host}`)
  return conn
}

export default connectDB
