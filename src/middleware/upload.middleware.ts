import multer from "multer";
import RestError from "../utils/rest-error";
import HttpStatusCodes from "../utils/HTTP_STATUS_CODES";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for allowed file types
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Define allowed mime types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new RestError(
        HttpStatusCodes.BAD_REQUEST,
        `File type not allowed: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(", ")}`
      ) as any
    );
  }
};

// Create multer upload instances
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// For images only
export const imageUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new RestError(
          HttpStatusCodes.BAD_REQUEST,
          `Only image files are allowed. Received: ${file.mimetype}`
        ) as any
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
});

// For videos only
export const videoUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/quicktime"];
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new RestError(
          HttpStatusCodes.BAD_REQUEST,
          `Only video files are allowed. Received: ${file.mimetype}`
        ) as any
      );
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
});

