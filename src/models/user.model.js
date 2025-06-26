import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
      required: [true, "Password is required"],
      minlenght: [6, "Password must be at least 6 characters long"],
      maxlenght: [20, "Password must be at most 20 characters long"],
    },
    refreshToken: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userSchame.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // if password has not been modified, then do not hash it
  this.password = await bcrypt.hash(this.password, Process.env.SALT_ROUNDS );
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
