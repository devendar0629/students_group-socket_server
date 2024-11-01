import mongoose from "mongoose";

export const connectDB = async () => {
    const options: mongoose.ConnectOptions = {
        dbName: process.env.DATABASE_NAME,
    };

    return mongoose
        .connect(process.env.MONGODB_URI!, options)
        .then(() => {
            console.log("🍀✅ MongoDB connection Succeeded.");
        })
        .catch((err: any) => {
            console.error("🍀❌ MongoDB connection failed.");
            console.log("ERROR: ", err);
            process.exit(1);
        });
};
