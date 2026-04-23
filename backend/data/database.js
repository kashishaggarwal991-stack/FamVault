const fs = require("fs/promises");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "db.json");
const DEFAULT_DB = {
  users: [],
  documents: [],
  emergencyDocuments: [],
  pins: [],
};

let operationQueue = Promise.resolve();

const clone = (value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));

const normalizeDb = (data = {}) => ({
  users: Array.isArray(data.users) ? data.users : [],
  documents: Array.isArray(data.documents) ? data.documents : [],
  emergencyDocuments: Array.isArray(data.emergencyDocuments) ? data.emergencyDocuments : [],
  pins: Array.isArray(data.pins) ? data.pins : [],
});

const ensureDbFile = async () => {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
};

const readDbFile = async () => {
  await ensureDbFile();

  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    if (!raw.trim()) {
      return clone(DEFAULT_DB);
    }

    return normalizeDb(JSON.parse(raw));
  } catch (error) {
    if (error instanceof SyntaxError) {
      await fs.writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
      return clone(DEFAULT_DB);
    }

    throw error;
  }
};

const writeDbFile = async (data) => {
  const normalized = normalizeDb(data);
  await fs.writeFile(DB_PATH, JSON.stringify(normalized, null, 2));
  return clone(normalized);
};

const runQueued = async (task) => {
  const queuedTask = operationQueue.then(task, task);
  operationQueue = queuedTask.then(
    () => undefined,
    () => undefined
  );
  return queuedTask;
};

const initializeDatabase = async () => {
  await runQueued(async () => {
    const data = await readDbFile();
    await writeDbFile(data);
    return data;
  });
};

const getDatabase = async () => {
  await operationQueue;
  return clone(await readDbFile());
};

const mutateDatabase = async (mutator) =>
  runQueued(async () => {
    const current = await readDbFile();
    const workingCopy = clone(current);
    const result = await mutator(workingCopy);
    await writeDbFile(workingCopy);
    return clone(result);
  });

module.exports = {
  getDatabase,
  initializeDatabase,
  mutateDatabase,
};
