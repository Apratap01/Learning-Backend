// require("dotenv").config({ path: "./.env" });
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import express from "express";
const app = express();

dotenv.config({
    path: "./.env"
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`  Server is running on tport : ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("Failed to connect to the database::",error);
});































































































































/*
import express from "express";

const app = express();


;( async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${
            DB_NAME}`)
            app.on("error" , (error) => {
                console.error("Error connecting to MongoDB:", error);
                throw error;
            })
        console.log("Connected to MongoDB");

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);   
        });        

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
        
    }
})()

*/


