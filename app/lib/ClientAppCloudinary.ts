import {v2 as cloudinary} from 'cloudinary';


cloudinary.config({
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '',
  apiSecret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || '',
});
export const cldb = cloudinary;

export default cloudinary;
