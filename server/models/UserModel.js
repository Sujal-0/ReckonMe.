import { genSalt } from "bcrypt";
import mongoose from "mongoose";
import { hash } from "bcrypt";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    username: { 
        type: String,
        unique: true,
        sparse: true // Allows multiple documents to have a null username
    },
    createdAt: {
    type: Date,
    default: Date.now,
  },
    
});

userSchema.pre("save", async function(next) {
    const salt = await genSalt();
    this.password = await hash(this.password, salt);
    next();
});

// Inside your userSchema
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("Users", userSchema);

export default User;