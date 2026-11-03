import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";
import { ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI);
let booksCollection;
let BookingsCollection;
let databaseConnection;

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header missing",
    });
  }
  const token = authHeader.split(" ")[1];
  console.log("Token:", token);

  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
  );

  try {
    const payload = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

async function connectToMongoDB() {
  if (!databaseConnection) {
    databaseConnection = client.connect().then(() => {
      console.log("Successfully connected to MongoDB!");
    });
  }

  return databaseConnection;
}

app.use(async (_req, _res, next) => {
  try {
    await connectToMongoDB();
    next();
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    next(error);
  }
});
const db = client.db("booknookDB");
booksCollection = db.collection("books");
BookingsCollection = db.collection("bookings");
// Add Book API
app.post("/add-books", verifyToken, async (req, res) => {
  try {
    const bookData = req.body;
    console.log("Request body:", bookData);

    // Check required fields
    if (
      !bookData ||
      !bookData.title ||
      !bookData.author ||
      !bookData.category ||
      !bookData.description ||
      !bookData.ownerId
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields",
      });
    }

    // Prepare book data
    const newBook = {
      ...bookData,
      ownerId: String(bookData.ownerId),
      createdAt: new Date(),
    };

    // Save to MongoDB
    const result = await booksCollection.insertOne(newBook);

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

// Add Booking API
app.post("/bookings", async (req, res) => {
  try {
    const bookingData = req.body;
    const result = await BookingsCollection.insertOne(bookingData);

    return res.status(201).json({
      success: true,
      message: "Booking added successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Error adding booking:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add booking",
    });
  }
});

app.get("/my-bookings/:email", async (req, res) => {
  const { email } = req.params;
  const result = await BookingsCollection.find({ userEmail: email }).toArray();
  res.send(result);
});

app.delete("/all-bookings/:id", async (req, res) => {
  const { id } = req.params;
  const result = await BookingsCollection.deleteOne({ _id: id });
  res.send(result);
});

app.get("/my-books/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const books = await booksCollection.find({ ownerId: userId }).toArray();
    res.send({
      success: true,
      books,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Failed to fetch books",
    });
  }
});

// Get All Books API
app.get("/all-books", async (req, res) => {
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

// Get Single Book API
app.get("/all-books/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
    }

    const result = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    console.error("Error fetching book:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
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

if (process.env.NODE_ENV !== "production") {
  connectToMongoDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("MongoDB Connection Error:", error);
      process.exit(1);
    });
}

export default app;
