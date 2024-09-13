


import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Profile image name and collection lists
// const profileImgsNameList = [
//     'Garfield', 'Tinkerbell', 'Annie', 'Loki', 'Cleo', 'Angel', 'Bob', 
//     'Mia', 'Coco', 'Gracie', 'Bear', 'Bella', 'Abby', 'Harley', 
//     'Cali', 'Leo', 'Luna', 'Jack', 'Felix', 'Kiki'
// ];
// const profileImgsCollectionsList = [
//     'notionists-neutral', 'adventurer-neutral', 'fun-emoji'
// ];

// // Generate default profile image URL
// const generateProfileImageUrl = () => {
//     const name = profileImgsNameList[Math.floor(Math.random() * profileImgsNameList.length)];
//     const collection = profileImgsCollectionsList[Math.floor(Math.random() * profileImgsCollectionsList.length)];
//     return `https://api.dicebear.com/6.x/${collection}/svg?seed=${name}`;
// };
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

// Middleware to hash the password before saving
// userSchema.pre('save', async function (next) {
//     if (!this.isModified('password')) return next();

//     try {
//         const salt = await bcrypt.genSalt(10);
//         this.password = await bcrypt.hash(this.password, salt);
//         next();
//     } catch (error) {
//         next(error);
//     }
// });

// Export the User model
export default mongoose.model('User', userSchema);
