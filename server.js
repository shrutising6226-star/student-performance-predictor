/**
 * server.js
 * Express.js backend server.
 * Handles routing, custom authorization middleware, database bindings, and machine learning math.
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const Database = require('./db-manager');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware for parsing JSON and serving public static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === IN-MEMORY SESSION STORE ===
const activeSessions = new Map(); // token -> safeUserProfile

// Helper to generate secure tokens
function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. Authorization header is missing.' });
  }

  // Token format: "Bearer <token>"
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const sessionUser = activeSessions.get(token);

  if (!sessionUser) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  req.user = sessionUser;
  next();
}

// === AUTHENTICATION ENDPOINTS ===

// Register a new account
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, name, role } = req.body;

  if (!username || !email || !password || !name) {
    return res.status(400).json({ error: 'All registration fields (username, email, password, name) are required.' });
  }

  const user = Database.registerUser(username, email, password, name, role || 'educator');
  if (!user) {
    return res.status(409).json({ error: 'Username or Email is already registered.' });
  }

  res.status(201).json({ message: 'Account created successfully!', user });
});

// Login and obtain a session token
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = Database.authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Session Token Assignment
  const token = generateToken();
  activeSessions.set(token, user);

  res.json({
    message: 'Login successful!',
    token,
    user
  });
});

// Logout and terminate session
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  
  activeSessions.delete(token);
  res.json({ message: 'Logged out successfully.' });
});

// Fetch current user details
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// === STUDENT DIRECTORY ENDPOINTS ===

// Get student records for the logged-in user
app.get('/api/students', requireAuth, (req, res) => {
  const students = Database.getStudents(req.user.id);
  res.json({ students });
});

// Create a new student record
app.post('/api/students', requireAuth, (req, res) => {
  const { name, attendance, studyHours, sleepHours, stressLevel, prevGrade } = req.body;

  if (!name || attendance === undefined || studyHours === undefined || sleepHours === undefined || stressLevel === undefined || prevGrade === undefined) {
    return res.status(400).json({ error: 'All fields (name, attendance, studyHours, sleepHours, stressLevel, prevGrade) are required.' });
  }

  // Quick predict using server model coefficients
  const model = Database.getModel();
  const features = [
    parseFloat(attendance),
    parseFloat(studyHours),
    parseFloat(sleepHours),
    parseFloat(stressLevel),
    parseFloat(prevGrade)
  ];

  // Perform prediction calculation
  let finalGrade = model.intercept;
  for (let i = 0; i < features.length; i++) {
    finalGrade += features[i] * model.weights[i];
  }
  finalGrade = Math.max(0, Math.min(100, finalGrade));

  const student = Database.addStudent({
    name,
    attendance,
    studyHours,
    sleepHours,
    stressLevel,
    prevGrade,
    finalGrade: parseFloat(finalGrade.toFixed(1))
  }, req.user.id);

  res.status(201).json({ message: 'Student record added.', student });
});

// Delete a student record
app.delete('/api/students/:id', requireAuth, (req, res) => {
  const deleted = Database.deleteStudent(req.params.id, req.user.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Student record not found or unauthorized.' });
  }
  res.json({ message: 'Student record deleted successfully.' });
});

// Create student records in bulk
app.post('/api/students/bulk', requireAuth, (req, res) => {
  const { students } = req.body;
  if (!students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Payload must contain a students array.' });
  }

  const model = Database.getModel();
  const processed = students.map(s => {
    const att = parseFloat(s.attendance || 85);
    const study = parseFloat(s.studyHours || 15);
    const sleep = parseFloat(s.sleepHours || 8);
    const stress = parseFloat(s.stressLevel || 5);
    const prev = parseFloat(s.prevGrade || 75);

    let score = model.intercept;
    score += att * model.weights[0];
    score += study * model.weights[1];
    score += sleep * model.weights[2];
    score += stress * model.weights[3];
    score += prev * model.weights[4];
    score = Math.max(0, Math.min(100, score));

    return {
      name: s.name || 'Bulk Student',
      attendance: att,
      studyHours: study,
      sleepHours: sleep,
      stressLevel: stress,
      prevGrade: prev,
      finalGrade: parseFloat(score.toFixed(1))
    };
  });

  const inserted = Database.addStudentsBulk(processed, req.user.id);
  res.status(201).json({ message: `Successfully imported ${inserted.length} student records.`, count: inserted.length });
});

// === MACHINE LEARNING PREDICT ENDPOINT ===

// Predict student score using backend model
app.post('/api/predict', (req, res) => {
  const { attendance, studyHours, sleepHours, stressLevel, prevGrade } = req.body;

  if (attendance === undefined || studyHours === undefined || sleepHours === undefined || stressLevel === undefined || prevGrade === undefined) {
    return res.status(400).json({ error: 'All features are required.' });
  }

  const model = Database.getModel();
  const features = [
    parseFloat(attendance),
    parseFloat(studyHours),
    parseFloat(sleepHours),
    parseFloat(stressLevel),
    parseFloat(prevGrade)
  ];

  let score = model.intercept;
  for (let i = 0; i < features.length; i++) {
    score += features[i] * model.weights[i];
  }
  score = Math.max(0, Math.min(100, score));

  res.json({
    prediction: parseFloat(score.toFixed(1)),
    model
  });
});

// === MACHINE LEARNING TRAINING MATH & ENDPOINT ===

// Matrix operations
function transpose(A) {
  const rows = A.length;
  const cols = A[0].length;
  const T = Array(cols).fill(0).map(() => Array(rows).fill(0));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = A[i][j];
    }
  }
  return T;
}

function multiply(A, B) {
  const rowsA = A.length;
  const colsA = A[0].length;
  const rowsB = B.length;
  const colsB = B[0].length;
  if (colsA !== rowsB) {
    throw new Error('Matrix dimension mismatch');
  }
  const C = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
  for (let i = 0; i < rowsA; i++) {
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

function invert(A) {
  const n = A.length;
  const aug = Array(n).fill(0).map((_, i) => {
    const row = [...A[i]];
    const identity = Array(n).fill(0);
    identity[i] = 1;
    return row.concat(identity);
  });

  for (let i = 0; i < n; i++) {
    let maxEl = Math.abs(aug[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > maxEl) {
        maxEl = Math.abs(aug[k][i]);
        maxRow = k;
      }
    }

    if (maxRow !== i) {
      const temp = aug[i];
      aug[i] = aug[maxRow];
      aug[maxRow] = temp;
    }

    if (Math.abs(aug[i][i]) < 1e-10) {
      throw new Error("Matrix is singular");
    }

    const pivot = aug[i][i];
    for (let j = i; j < 2 * n; j++) {
      aug[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug[k][i];
        for (let j = i; j < 2 * n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }
  }
  return aug.map(row => row.slice(n));
}

// Retrain model weights on all records in database
app.post('/api/train', requireAuth, (req, res) => {
  const db = require('./data/db.json'); // Direct require is cached, so we read it using fs or via helper:
  const students = Database.getStudents(req.user.id);

  if (students.length < 6) {
    return res.status(400).json({ error: 'Training requires at least 6 student records in your directory to fit weights safely.' });
  }

  try {
    const X = students.map(s => [
      1, // Intercept term
      parseFloat(s.attendance),
      parseFloat(s.studyHours),
      parseFloat(s.sleepHours),
      parseFloat(s.stressLevel),
      parseFloat(s.prevGrade)
    ]);
    const y = students.map(s => [parseFloat(s.finalGrade)]);

    const XT = transpose(X);
    const XTX = multiply(XT, X);

    // Regularize slightly to prevent singular matrix error
    const ridgeStrength = 1e-4;
    for (let i = 0; i < XTX.length; i++) {
      XTX[i][i] += ridgeStrength;
    }

    const invXTX = invert(XTX);
    const XTy = multiply(XT, y);
    const beta = multiply(invXTX, XTy);

    // Extract weights
    const intercept = beta[0][0];
    const weights = beta.slice(1).map(b => b[0]);

    // Compute metrics R2 & MSE
    let sumSquaredError = 0;
    let sumTotalError = 0;
    const actuals = students.map(s => s.finalGrade);
    const yMean = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;

    const predictions = students.map((s, idx) => {
      let pred = intercept + 
                 weights[0] * s.attendance + 
                 weights[1] * s.studyHours + 
                 weights[2] * s.sleepHours + 
                 weights[3] * s.stressLevel + 
                 weights[4] * s.prevGrade;
      pred = Math.max(0, Math.min(100, pred));
      
      const act = s.finalGrade;
      sumSquaredError += Math.pow(act - pred, 2);
      sumTotalError += Math.pow(act - yMean, 2);
      return pred;
    });

    const mse = sumSquaredError / students.length;
    const r2 = sumTotalError === 0 ? 0 : 1 - (sumSquaredError / sumTotalError);

    // Save model to db
    const savedModel = Database.saveModel(weights, intercept, r2, mse);

    res.json({
      message: 'Model trained successfully on your dataset!',
      model: savedModel
    });
  } catch (err) {
    console.error("Training failed:", err);
    res.status(500).json({ error: 'Math training engine error: ' + err.message });
  }
});

// Default root route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Startup server listener
app.listen(PORT, () => {
  console.log(`EduPredict Full-Stack running on http://localhost:${PORT}`);
});
