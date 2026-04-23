const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { getDatabase, mutateDatabase } = require("./database");

const sanitizeEmail = (email = "") => email.trim().toLowerCase();
const sanitizeUsername = (username = "") => username.trim().toLowerCase();

const normalizeRequest = (request) => ({
  _id: request._id || randomUUID(),
  adminId: request.adminId,
  adminName: request.adminName || "",
  familyId: request.familyId || null,
  status: request.status || "pending",
  createdAt: request.createdAt || new Date().toISOString(),
});

const normalizeUser = (user) => ({
  ...user,
  username: user.username || "",
  familyId: user.familyId || null,
  requests: Array.isArray(user.requests) ? user.requests.map(normalizeRequest) : [],
});

const toPublicUser = (user) => {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return normalizeUser(safeUser);
};

const findUserByEmail = async (email) => {
  const db = await getDatabase();
  const user = db.users.find((entry) => entry.email === sanitizeEmail(email)) || null;
  return user ? normalizeUser(user) : null;
};

const findUserByUsername = async (username) => {
  const db = await getDatabase();
  const user = db.users.find((entry) => sanitizeUsername(entry.username) === sanitizeUsername(username)) || null;
  return user ? normalizeUser(user) : null;
};

const findUserById = async (id, options = {}) => {
  const db = await getDatabase();
  const user = db.users.find((entry) => entry._id === id) || null;

  if (!user) return null;
  const normalizedUser = normalizeUser(user);
  return options.includePassword ? { ...normalizedUser } : toPublicUser(normalizedUser);
};

const searchAvailableMembersByUsername = async (username) => {
  const db = await getDatabase();
  const query = sanitizeUsername(username);

  return db.users
    .map(normalizeUser)
    .filter((user) =>
      user.role === "member" &&
      !user.familyId &&
      user.username &&
      user.username.toLowerCase().includes(query)
    )
    .map(toPublicUser);
};

const countUsers = async () => {
  const db = await getDatabase();
  return db.users.length;
};

const createUser = async ({ name, username, email, password, role = "member", familyId, prehashed = false }) => {
  const now = new Date().toISOString();
  const passwordHash = prehashed ? password : await bcrypt.hash(password, 10);
  const normalizedEmail = sanitizeEmail(email);
  const normalizedUsername = sanitizeUsername(username);

  return mutateDatabase(async (db) => {
    const exists = db.users.some((user) => user.email === normalizedEmail);
    if (exists) {
      const error = new Error("Email already registered");
      error.code = "EMAIL_EXISTS";
      throw error;
    }

    const usernameExists = db.users.some(
      (user) => sanitizeUsername(user.username) === normalizedUsername
    );
    if (usernameExists) {
      const error = new Error("Username already taken");
      error.code = "USERNAME_EXISTS";
      throw error;
    }

    const user = {
      _id: randomUUID(),
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: passwordHash,
      role,
      familyId: familyId || null,
      requests: [],
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(user);
    return toPublicUser(user);
  });
};

const updateUserById = async (id, updates) =>
  mutateDatabase(async (db) => {
    const user = db.users.find((entry) => entry._id === id);
    if (!user) return null;

    if (updates.username) {
      const normalizedUsername = sanitizeUsername(updates.username);
      const usernameExists = db.users.some(
        (entry) => entry._id !== id && sanitizeUsername(entry.username) === normalizedUsername
      );

      if (usernameExists) {
        const error = new Error("Username already taken");
        error.code = "USERNAME_EXISTS";
        throw error;
      }

      updates.username = normalizedUsername;
    }

    if (updates.requests) {
      updates.requests = updates.requests.map(normalizeRequest);
    }

    Object.assign(user, updates, {
      updatedAt: new Date().toISOString(),
    });

    return toPublicUser(user);
  });

const matchPassword = async (enteredPassword, hashedPassword) =>
  bcrypt.compare(enteredPassword, hashedPassword);

module.exports = {
  countUsers,
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  matchPassword,
  searchAvailableMembersByUsername,
  toPublicUser,
  updateUserById,
};
