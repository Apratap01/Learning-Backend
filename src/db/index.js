import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import express from "express";

const app = express();

const connectDB = async () => {
    try {
         const connectionInstance =  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to MongoDB");
        console.log(`\n MongoDB connected!!${connectionInstance.connection.host}`);
        
    } catch (error) {
        console.error("Error connecting to MongoDB: Correct something and then restart", error);
        process.exit(1); // Exit the process if connection fails
    }
};

export default connectDB;