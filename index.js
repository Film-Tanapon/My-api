import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3'; // Use verbose is not a standard import option
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Import fs module for directory creation

const app = express();
const db = new sqlite3.Database("./database.sqlite");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      season TEXT,
      image_url TEXT,
      eng_description TEXT,
      thai_description TEXT,
      short_description TEXT,
      price REAL,
      caution TEXT,
      source TEXT
    )`);
});

// CRUD operations for Products
app.get('/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Read One
app.get('/products/:id', (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(row);
  });
});

// Update
app.put('/products/:id', upload.single('image'), (req, res) => {
  const productId = req.params.id;
  const { name, season, eng_description, thai_description, short_description, price, caution, source, image_url: bodyImageUrl } = req.body;
  const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : bodyImageUrl;

  db.run(
    `UPDATE products 
     SET name = ?, season = ?, image_url = ?, eng_description = ?, thai_description = ?, short_description = ?, price = ?, caution = ?, source = ?
     WHERE id = ?`,
    [name, season, uploadedImageUrl, eng_description, thai_description, short_description, price, caution, source, productId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ changes: this.changes });
    }
  );
});

app.post('/products', upload.single('image'), (req, res) => {
  const { name, season, eng_description, thai_description, short_description, price, caution, source, image_url: bodyImageUrl} = req.body;
  const uploadedImageUrl = req.file ? `/uploads/${req.file.filename}` : bodyImageUrl;

  // Data validation: Ensure required fields are present and have the correct format
  db.run("INSERT INTO products (name, season, image_url, eng_description, thai_description, short_description, price, caution, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [name, season, uploadedImageUrl, eng_description, thai_description, short_description, price, caution, source], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID,
      name,
      season,
      image: uploadedImageUrl,
      eng_description,
      thai_description,
      short_description,
      price,
      caution,
      source
     });
  });
});

// Delete
app.delete("/products/:id", (req, res) => {
  const productId = req.params.id;
  db.run("DELETE FROM products WHERE id = ?", [productId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(`Hello ${name}!`);
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});