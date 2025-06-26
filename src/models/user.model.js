import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { MESSAGES } from "../constants.js";


const userSchame = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // cloudanary url used to store image
      required: true,
    },
    coverImage: {
      type: String, // cloudanary url used to store image
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
   
      password: {
        type: String,
        required: [true, MESSAGES.PASSWORD_REQUIRED],
        minlength: [6, MESSAGES.PASSWORD_MIN],
        maxlength: [20, MESSAGES.PASSWORD_MAX],
      },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchame.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // if password has not been modified, then do not hash it
  this.password = await bcrypt.hash(this.password, parseInt(process.env.SALT_ROUNDS));
  next();
});

userSchame.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchame.methods.generateAccessToken = function () {
   return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        fullName: this.fullName,
        username: this.username,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_EXPIRES_IN,
      },
    );
};
userSchame.methods.generateRefreshToken = function () {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        fullName: this.fullName,
        username: this.username,
      },
      process.env.REFRESH_TOKEN,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
      },
    );
  };

export const User = mongoose.model("User", userSchame);
