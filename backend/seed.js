import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import bcrypt from "bcrypt";
import doctorModel from "./models/doctorModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const doctorsConfigPath = path.join(__dirname, 'doctors.json');
const doctorsData = JSON.parse(fs.readFileSync(doctorsConfigPath, 'utf8'));

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("12345678", salt); // default password for seeded doctors

        let addedCount = 0;

        for (let i = 0; i < doctorsData.length; i++) {
            const doc = doctorsData[i];
            const email = `doc${i + 1}@prescripto.com`;

            const exists = await doctorModel.findOne({ email });
            if (exists) {
                console.log(`Doctor ${email} already exists, skipping.`);
                continue;
            }

            console.log(`Uploading image for ${doc.name}...`);
            const imageUpload = await cloudinary.uploader.upload(path.join(__dirname, doc.imagePath), { resource_type: "image" });

            const doctorData = {
                name: doc.name,
                email,
                image: imageUpload.secure_url,
                password: hashedPassword,
                speciality: doc.speciality,
                degree: doc.degree,
                experience: doc.experience,
                about: doc.about,
                fees: doc.fees,
                address: doc.address,
                date: Date.now()
            };

            const newDoctor = new doctorModel(doctorData);
            await newDoctor.save();
            console.log(`Successfully added ${doc.name}`);
            addedCount++;
        }

        console.log(`Seeding complete! Added ${addedCount} doctors.`);
        process.exit(0);
    } catch (error) {
        console.error("Error seeding DB:", error);
        process.exit(1);
    }
}

seedDB();
