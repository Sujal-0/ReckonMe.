import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/AuthRoutes.js";
import contactRoutes from "./routes/ContactRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import initSocket from "./socket/socket.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const databaseURL = process.env.DATABASE_URL;

app.use(cors({
    origin: [process.env.ORIGIN],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use("/api", contactRoutes); 
app.use("/api/rooms", roomRoutes);


const server = app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// ✅ Initialize socket
initSocket(server);

mongoose.connect(databaseURL).then(() => 
  console.log("DB connected successfully")).catch((err) => {
    console.error("DB connection error:", err.message)
  });

