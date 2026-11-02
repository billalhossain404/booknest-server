import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI);

let booksCollection;

// Connect MongoDB
async function connectToMongoDB() {
  try {
    await client.connect();

    console.log("Successfully connected to MongoDB!");

    const db = client.db("booknookDB");
    booksCollection = db.collection("books");

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
}

// Add Book API
app.post("/add-books", async (req, res) => {
  try {
    const bookData = req.body;

    console.log("Request body:", bookData);

    if (
      !bookData ||
      !bookData.title ||
      !bookData.author ||
      !bookData.category ||
      !bookData.description
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    const result = await booksCollection.insertOne(bookData);

    return res.status(201).json({
      success: true,
      message: "Book added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding book:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add book",
    });
  }
});

// Get All Books API
app.get("/books", async (req, res) => {
  try {
    const books = await booksCollection.find().toArray();

    return res.status(200).json({
      success: true,
      books,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

// Home Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BookNook API is running",
  });
});

// Start Server
connectToMongoDB();
