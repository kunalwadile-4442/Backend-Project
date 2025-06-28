import { MESSAGES } from "../constants.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";


// when not getting res the used a _
// export const verifyJWT = asyncHandler(async (req, res, next) => {
  export const verifyJWT = asyncHandler(async (req, _, next) => {

  try {
    const token =
      req.cookie?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, MESSAGES.UNAUTHORIZED_ACCESS);
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // discussion - what if user is deleted
      throw new ApiError(401, MESSAGES.INVALID_ACCESS_TOKEN);
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, MESSAGES.INVALID_ACCESS_TOKEN);
  }
});
