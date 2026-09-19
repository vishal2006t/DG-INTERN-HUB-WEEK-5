const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. Mongoose Schema Definition (MongoDB Atlas)
// ==========================================
const activityItemSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    ip: { type: String, default: '127.0.0.1' },
    userAgent: { type: String, default: 'Client' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Valid email required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: 'shield-cyan',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    activityLog: {
      type: [activityItemSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.logActivity = async function (action, req) {
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
  const userAgent = req ? (req.headers['user-agent'] || 'Direct Client') : 'System Internal';

  this.activityLog.unshift({
    action,
    ip: String(ip).split(',')[0].trim(),
    userAgent: String(userAgent).substring(0, 150),
    timestamp: new Date(),
  });

  if (this.activityLog.length > 20) {
    this.activityLog = this.activityLog.slice(0, 20);
  }

  await this.save();
};

const MongooseUser = mongoose.models.User || mongoose.model('User', userSchema);

// ==========================================
// 2. Local Persistence Store (Zero-Config Fallback)
// ==========================================
const DATA_DIR = path.join(__dirname, '../data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'local_users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readLocalUsers() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalUsers(users) {
  ensureDataDir();
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

class LocalUserDoc {
  constructor(data) {
    this._id = data._id ? String(data._id) : crypto.randomBytes(12).toString('hex');
    this.name = data.name;
    this.email = data.email ? data.email.toLowerCase().trim() : '';
    this.password = data.password;
    this.role = data.role || 'user';
    this.avatar = data.avatar || 'shield-cyan';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.lastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
    this.activityLog = Array.isArray(data.activityLog) ? data.activityLog : [];
    this._isPasswordModified = Boolean(data.password && !data.password.startsWith('$2'));
  }

  async comparePassword(candidate) {
    if (!this.password) return false;
    return await bcrypt.compare(candidate, this.password);
  }

  async logActivity(action, req) {
    const ip = req ? (req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers?.['user-agent'] || 'Direct Client') : 'System Internal';

    this.activityLog.unshift({
      action,
      ip: String(ip).split(',')[0].trim(),
      userAgent: String(userAgent).substring(0, 150),
      timestamp: new Date(),
    });

    if (this.activityLog.length > 20) {
      this.activityLog = this.activityLog.slice(0, 20);
    }

    await this.save();
  }

  async save() {
    const users = readLocalUsers();
    
    // Hash password if not already bcrypt-hashed
    if (this._isPasswordModified || (this.password && !this.password.startsWith('$2'))) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
      this._isPasswordModified = false;
    }

    const idx = users.findIndex((u) => String(u._id) === String(this._id));
    const serialized = {
      _id: this._id,
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role,
      avatar: this.avatar,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
      activityLog: this.activityLog,
    };

    if (idx >= 0) {
      users[idx] = serialized;
    } else {
      users.push(serialized);
    }

    writeLocalUsers(users);
    return this;
  }

  toJSON() {
    return {
      _id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
      avatar: this.avatar,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
    };
  }
}

// Single Doc Query Chain (supports .select() and await)
class LocalDocQuery {
  constructor(docPromise) {
    this.promise = docPromise;
  }

  select() {
    return this;
  }

  async then(resolve, reject) {
    try {
      const doc = await this.promise;
      resolve(doc);
    } catch (err) {
      reject(err);
    }
  }
}

// Multiple Docs Query Chain (supports .sort(), .select(), .limit() and await)
class LocalQuery {
  constructor(usersPromise) {
    this.promise = usersPromise;
    this.sortField = null;
    this.sortAsc = true;
    this.limitCount = null;
  }

  sort(sortStr) {
    if (sortStr) {
      this.sortAsc = !sortStr.startsWith('-');
      this.sortField = sortStr.replace(/^[+-]/, '');
    }
    return this;
  }

  select() {
    return this;
  }

  limit(n) {
    this.limitCount = n;
    return this;
  }

  async then(resolve, reject) {
    try {
      let results = await this.promise;
      if (this.sortField) {
        results.sort((a, b) => {
          let valA = a[this.sortField];
          let valB = b[this.sortField];
          if (valA instanceof Date) valA = valA.getTime();
          if (valB instanceof Date) valB = valB.getTime();
          if (valA < valB) return this.sortAsc ? -1 : 1;
          if (valA > valB) return this.sortAsc ? 1 : -1;
          return 0;
        });
      }
      if (this.limitCount !== null) {
        results = results.slice(0, this.limitCount);
      }
      resolve(results);
    } catch (err) {
      reject(err);
    }
  }
}

const LocalUser = {
  findOne(query = {}) {
    const p = (async () => {
      const users = readLocalUsers();
      const email = query.email ? query.email.toLowerCase().trim() : null;

      const found = users.find((u) => {
        if (email && u.email !== email) return false;
        if (query.role && u.role !== query.role) return false;
        return true;
      });

      return found ? new LocalUserDoc(found) : null;
    })();
    return new LocalDocQuery(p);
  },

  findById(id) {
    const p = (async () => {
      const users = readLocalUsers();
      const found = users.find((u) => String(u._id) === String(id));
      return found ? new LocalUserDoc(found) : null;
    })();
    return new LocalDocQuery(p);
  },

  find(query = {}) {
    const users = readLocalUsers();

    let matched = users.filter((u) => {
      if (query.role && u.role !== query.role) return false;
      if (query.$or && Array.isArray(query.$or)) {
        const matchesAny = query.$or.some((condition) => {
          if (condition.name && condition.name instanceof RegExp) {
            return condition.name.test(u.name);
          }
          if (condition.email && condition.email instanceof RegExp) {
            return condition.email.test(u.email);
          }
          return false;
        });
        if (!matchesAny) return false;
      }
      return true;
    });

    const docs = matched.map((u) => new LocalUserDoc(u));
    return new LocalQuery(Promise.resolve(docs));
  },

  async countDocuments(query = {}) {
    const users = readLocalUsers();
    if (!query || Object.keys(query).length === 0) {
      return users.length;
    }
    return users.filter((u) => {
      if (query.role && u.role !== query.role) return false;
      if (query.createdAt && query.createdAt.$gte) {
        const threshold = new Date(query.createdAt.$gte).getTime();
        const userTime = new Date(u.createdAt).getTime();
        if (userTime < threshold) return false;
      }
      if (query.lastLogin && query.lastLogin.$gte) {
        if (!u.lastLogin) return false;
        const threshold = new Date(query.lastLogin.$gte).getTime();
        const loginTime = new Date(u.lastLogin).getTime();
        if (loginTime < threshold) return false;
      }
      return true;
    }).length;
  },

  async findByIdAndDelete(id) {
    const users = readLocalUsers();
    const idx = users.findIndex((u) => String(u._id) === String(id));
    if (idx >= 0) {
      const removed = users.splice(idx, 1)[0];
      writeLocalUsers(users);
      return new LocalUserDoc(removed);
    }
    return null;
  },
};

// ==========================================
// 3. Unified User Interface
// ==========================================
class UserProxy {
  constructor(data) {
    if (mongoose.connection.readyState === 1) {
      return new MongooseUser(data);
    }
    return new LocalUserDoc(data);
  }

  static findOne(query) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findOne(query);
    }
    return LocalUser.findOne(query);
  }

  static findById(id) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findById(id);
    }
    return LocalUser.findById(id);
  }

  static find(query) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.find(query);
    }
    return LocalUser.find(query);
  }

  static countDocuments(query) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.countDocuments(query);
    }
    return LocalUser.countDocuments(query);
  }

  static findByIdAndDelete(id) {
    if (mongoose.connection.readyState === 1) {
      return MongooseUser.findByIdAndDelete(id);
    }
    return LocalUser.findByIdAndDelete(id);
  }
}

module.exports = UserProxy;
