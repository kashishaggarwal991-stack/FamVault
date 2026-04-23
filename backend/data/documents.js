const { randomUUID } = require("crypto");
const { getDatabase, mutateDatabase } = require("./database");

const sortByNewest = (items) =>
  [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const buildUploader = (user) => {
  if (!user) return null;

  return {
    _id: user._id,
    name: user.name,
    username: user.username || "",
    email: user.email,
    role: user.role,
  };
};

const sanitizeDocument = (document) => {
  if (!document) return null;

  // Security: never return the document password hash in API-facing data.
  const { documentPassword, ...safeDocument } = document;
  return {
    ...safeDocument,
    isPasswordProtected: Boolean(document.isPasswordProtected),
  };
};

const populateDocument = (document, users) => ({
  ...sanitizeDocument(document),
  uploadedBy: buildUploader(users.find((user) => user._id === document.uploadedBy)),
});

const createDocument = async (payload) => {
  const now = new Date().toISOString();

  return mutateDatabase(async (db) => {
    const document = {
      _id: randomUUID(),
      uploadedBy: payload.uploadedBy,
      familyId: payload.familyId,
      originalName: payload.originalName,
      filePath: payload.filePath,
      fileType: payload.fileType,
      fileSize: payload.fileSize,
      category: payload.category || "Uncategorized",
      summary: payload.summary || "",
      extractedInfo: payload.extractedInfo || {},
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      aiStatus: payload.aiStatus || "pending",
      label: payload.label || "",
      isPasswordProtected: Boolean(payload.isPasswordProtected),
      documentPassword: payload.documentPassword || null,
      createdAt: now,
      updatedAt: now,
    };

    db.documents.push(document);
    return sanitizeDocument(document);
  });
};

const getRawDocumentById = async (id) => {
  const db = await getDatabase();
  return db.documents.find((document) => document._id === id) || null;
};

const getRawDocumentWithPassword = async (id) => getRawDocumentById(id);

const getDocumentById = async (id) => {
  const db = await getDatabase();
  const document = db.documents.find((entry) => entry._id === id);

  if (!document) return null;
  return populateDocument(document, db.users);
};

const listDocuments = async (predicate) => {
  const db = await getDatabase();
  const filtered = typeof predicate === "function" ? db.documents.filter(predicate) : db.documents;
  return sortByNewest(filtered).map((document) => populateDocument(document, db.users));
};

const updateDocumentById = async (id, updates) =>
  mutateDatabase(async (db) => {
    const document = db.documents.find((entry) => entry._id === id);
    if (!document) return null;

    Object.assign(document, updates, {
      updatedAt: new Date().toISOString(),
    });

    return sanitizeDocument(document);
  });

const deleteDocumentById = async (id) =>
  mutateDatabase(async (db) => {
    const index = db.documents.findIndex((document) => document._id === id);
    if (index === -1) return null;

    const [removed] = db.documents.splice(index, 1);
    return removed;
  });

module.exports = {
  createDocument,
  deleteDocumentById,
  getDocumentById,
  getRawDocumentById,
  getRawDocumentWithPassword,
  listDocuments,
  sanitizeDocument,
  updateDocumentById,
};
