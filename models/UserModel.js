


import mongoose, { Schema } from 'mongoose';


let profile_imgs_name_list = ["Garfield", "Tinkerbell", "Annie", "Loki", "Cleo", "Angel", "Bob", "Mia", "Coco", "Gracie", "Bear", "Bella", "Abby", "Harley", "Cali", "Leo", "Luna", "Jack", "Felix", "Kiki"];
let profile_imgs_collections_list = ["notionists-neutral", "adventurer-neutral", "fun-emoji"];

// Define User schema
const userSchema = new mongoose.Schema({
    fullname: { type: String, required: true ,  minlength: [3, 'fullname must be 3 letters long'], lowercase: true,},
    email: { type: String, required: true, unique: true , trim: true},
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    username: {
        type: String,
        minlength: [3, 'Username must be at least 3 letters long'],
        unique: true,
    },
    profile_img: {
        type: String,
        default: () => {
            return `https://api.dicebear.com/6.x/${profile_imgs_collections_list[Math.floor(Math.random() * profile_imgs_collections_list.length)]}/svg?seed=${profile_imgs_name_list[Math.floor(Math.random() * profile_imgs_name_list.length)]}`
        } 
    }
}, {
    timestamps: { createdAt: 'joinedAt' } // Ensure correct placement of timestamps option
});

export default mongoose.model('User', userSchema);
