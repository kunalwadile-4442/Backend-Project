import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";
import { MESSAGES } from "../constants.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exist  : username and email
  // check for images : avatar is mandotory
  // upload then save to cloudinary
  // create user obkect -  create entry in db
  // remove password in response and refreshtiken
  // check for user creation
  // return res

  const { username, email, password, fullName } = req.body;
  console.log("req.body", req.body);

  // Check if any field is missing or just spaces
  if (
    [fullName, email, password, username].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, MESSAGES.REQUIRED_FIELDS);
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    if (existedUser.username === username) {
      throw new ApiError(409, MESSAGES.USERNAME_ALREADY_EXISTS);
    } else if (existedUser.email === email) {
      throw new ApiError(409, MESSAGES.EMAIL_ALREADY_EXISTS);
    }
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, MESSAGES.AVATAR_REQUIRED);
  }
  console.log("req.files", req.files);

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiError(400, MESSAGES.AVATAR_UPLOAD_FAILED);
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url ?? null,
    email,
    username: username.toLowerCase(),
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  console.log("createdUser", createdUser);
  if (!createdUser) {
    throw new ApiError(500, MESSAGES.USER_REGISTRATION_FAILED);
  }

  //
  return res
    .status(201)
    .json(
      new ApiResponse(200, createdUser, MESSAGES.USER_REGISTERED_SUCCESSFULLY)
    );
});

export { registerUser };
