import multer from "multer";

const storage = multer.memoryStorage();

const limits = { fileSize: 10 * 1024 * 1024 };

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported file type"), false);
};

const upload = multer({ storage, limits, fileFilter });

export const uploadSingle = (field) => upload.single(field);
export const uploadArray = (field, max = 10) => upload.array(field, max);
export const uploadFields = (fields) => upload.fields(fields);
export default upload;

