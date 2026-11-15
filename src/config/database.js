const mongoose = require("mongoose");

const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error("MONGO_URI is not configured");
    }

    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });

        console.log("MongoDB connected successfully");
    } catch (error) {
        throw new Error(`MongoDB connection failed (${error.name}). Check the URI, network, and Atlas IP access list.`);
    }
};

module.exports = connectDB;
