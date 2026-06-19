/**
 * db-manager.js
 * In-process file-based JSON database manager.
 * Provides user account hashing, session validation, student directories, and model parameters saving.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure database file and directory exist
function ensureDatabase() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      users: [],
      students: [],
      model: {
        intercept: 28.54,
        weights: [0.30, 0.58, 1.10, -0.52, 0.22], // Attendance, Study Hours, Sleep Hours, Stress, Midterm
        r2: 0.89,
        mse: 4.85
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

// Read database contents
function readDB() {
  ensureDatabase();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Database read error, returning default data:", err);
    return { users: [], students: [], model: {} };
  }
}

// Write database contents
function writeDB(data) {
  ensureDatabase();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Database write error:", err);
    return false;
  }
}

// Cryptographic hash for passwords (SHA-256)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Database API Exports
const Database = {
  // === Authentication Operations ===

  /**
   * Registers a new user account.
   * @returns {Object|null} The created user profile (without password) or null if already exists
   */
  registerUser(username, email, password, name, role = 'educator') {
    const db = readDB();
    
    // Normalize inputs
    const uName = username.trim().toLowerCase();
    const uEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.users.find(u => u.username === uName || u.email === uEmail);
    if (existing) {
      return null;
    }

    const newUser = {
      id: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: uName,
      email: uEmail,
      passwordHash: hashPassword(password),
      name: name.trim(),
      role: role.toLowerCase(),
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    // Return safe profile
    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  },

  /**
   * Authenticates a user login request.
   * @returns {Object|null} Safe user profile if valid, or null
   */
  authenticateUser(username, password) {
    const db = readDB();
    const uName = username.trim().toLowerCase();
    const hash = hashPassword(password);

    const user = db.users.find(u => u.username === uName && u.passwordHash === hash);
    if (!user) {
      return null;
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },

  // === Student Record CRUD Operations ===

  /**
   * Fetches all student records created by a specific user.
   */
  getStudents(userId) {
    const db = readDB();
    return db.students.filter(s => s.creatorId === userId);
  },

  /**
   * Adds a new student profile to the directory.
   */
  addStudent(studentData, userId) {
    const db = readDB();
    const nextId = `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newStudent = {
      id: nextId,
      creatorId: userId,
      name: studentData.name.trim(),
      attendance: parseFloat(studentData.attendance),
      studyHours: parseFloat(studentData.studyHours),
      sleepHours: parseFloat(studentData.sleepHours),
      stressLevel: parseFloat(studentData.stressLevel),
      prevGrade: parseFloat(studentData.prevGrade),
      finalGrade: parseFloat(studentData.finalGrade),
      createdAt: new Date().toISOString()
    };

    db.students.push(newStudent);
    writeDB(db);
    return newStudent;
  },

  /**
   * Adds multiple student profiles in bulk.
   */
  addStudentsBulk(studentsArray, userId) {
    const db = readDB();
    const inserted = [];
    const nowStr = new Date().toISOString();

    for (const data of studentsArray) {
      const nextId = `STU-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const newStudent = {
        id: nextId,
        creatorId: userId,
        name: data.name.trim(),
        attendance: parseFloat(data.attendance),
        studyHours: parseFloat(data.studyHours),
        sleepHours: parseFloat(data.sleepHours),
        stressLevel: parseFloat(data.stressLevel),
        prevGrade: parseFloat(data.prevGrade),
        finalGrade: parseFloat(data.finalGrade),
        createdAt: nowStr
      };
      db.students.push(newStudent);
      inserted.push(newStudent);
    }
    writeDB(db);
    return inserted;
  },

  /**
   * Removes a student record.
   */
  deleteStudent(studentId, userId) {
    const db = readDB();
    const initialLen = db.students.length;
    
    db.students = db.students.filter(s => !(s.id === studentId && s.creatorId === userId));
    
    const succeeded = db.students.length < initialLen;
    if (succeeded) {
      writeDB(db);
    }
    return succeeded;
  },

  // === ML Model Parameter Operations ===

  /**
   * Fetches the current trained model parameters.
   */
  getModel() {
    const db = readDB();
    return db.model;
  },

  /**
   * Saves updated model weights and parameters.
   */
  saveModel(weights, intercept, r2, mse) {
    const db = readDB();
    db.model = {
      weights: weights.map(w => parseFloat(w)),
      intercept: parseFloat(intercept),
      r2: parseFloat(r2),
      mse: parseFloat(mse)
    };
    writeDB(db);
    return db.model;
  }
};

module.exports = Database;
