// Import necessary modules
const express = require("express");
const bodyParser = require("body-parser");
const { connectToDatabase } = require("./database");
const { handleMongoBackend, handleJsonBackend } = require("./backend");

// Create an instance of the Express application
const app = express();

// Set the port for the server to listen on
const port = 3000;

// Use the bodyParser middleware to parse JSON in the request body
app.use(bodyParser.json());

// Specify the type of database you want to connect to (e.g., 'json' or 'mongo')
const dbType = 'json';

// Connect to the database based on the specified type
connectToDatabase(dbType);

// Use different route handling logic based on the database type
if (dbType === 'mongo') {
  // If the database is MongoDB, use routes specific to MongoDB
  handleMongoBackend(app);
} else {
  // If the database is JSON, use routes specific to JSON
  handleJsonBackend(app);
}

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});