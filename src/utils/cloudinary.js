import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Cloudinary config
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localPath) => {
    try {
        if (!localPath) return null;

        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto"
        });

        console.log("✅ File uploaded successfully!");
        console.log("📂 URL:", response.secure_url);

        fs.unlinkSync(localPath);

        return response;
    } catch (error) {
        console.error("❌ Cloudinary Upload Error:", error.message);

        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }

        return null;
    }
};

export default uploadOnCloudinary;
