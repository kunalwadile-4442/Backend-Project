import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }

    // upload a file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file upload successfully
    console.log("File uploaded successfully on Cloudinary", response.url);
    return response;
  } catch (err) {
    fs.unlinkSync(localFilePath); //remove the local saved temp file as the upload failed
    console.error("Error uploading file on Cloudinary", err);
    return null;
  }
};

export { uploadOnCloudinary };
