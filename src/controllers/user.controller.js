import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";
import { MESSAGES } from "../constants.js";
import jwt from "jsonwebtoken";

// token generation
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // save into database user refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, MESSAGES.TOKEN_GENRATION_FAILED);
  }
};

export { generateAccessAndRefreshToken };

// User it meane Mongooes Document
// user meand db instance of user model our user created entery
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

const loginUser = asyncHandler(async (req, res) => {
  // get req.body => data
  // access username or email and password
  // check the user exist or not
  // if username or email match show error
  // if not then login
  // genrate acces and fresh token
  // store the refresh token if user succesfull login
  // genrate acces tokken and store in browser local storage
  // saved as cookies
  // return res

  const { email, username, password } = req.body;
  if (!req.body) {
  throw new ApiError(400, MESSAGES.REQUEST_BODY_REQUIRED);
}

console.log("Req body",req.body);

  console.log("email",email)
  console.log("username", username);
  console.log("Password", password);
  // check for username
  if (!username && !email) {
    throw new ApiError(400, MESSAGES.USERNAME_PASSWORD_REQUIRED);
  }

  const user = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (!user) {
    throw new ApiError(400, MESSAGES.USER_NOT_FOUND);
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, MESSAGES.INVALID_USER_CREDENTIALS);
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

const options = {
  httpOnly: true,
  secure: true
}

  return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
          new ApiResponse(200,{
            user: loggedInUser, accessToken, refreshToken,
            message: MESSAGES.LOGIN_SUCCESSFUL,
          })
        )
 });   

 const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, MESSAGES.LOGOUT_SUCCESSFUL));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  
 const incommingRefreshToken =
   req.cookies.refreshToken || req.body.refreshToken;

   if(!incommingRefreshToken){
    throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
   }

  try {
    const decodedVerifyRefreshToken = await jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN
    );
  
    if (!decodedVerifyRefreshToken) {
      throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
    }
    const user = await User.findById(decodedVerifyRefreshToken?._id)
  
    if(!user){
      throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
    }
      if(incommingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, MESSAGES.REFRESH_TOKEN_EXPIRED);
    }
      const options = {
      httpOnly: true,
      secure: true,
    };
  
   const {accessToken, newRefreshToken} =   await generateAccessAndRefreshToken(user._id)
  
     return res.status(200).cookies("accessToken", accessToken, options)
     .cookies("refreshToken", newRefreshToken, options).json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken },
        MESSAGES.REFRESH_TOKEN_SUCCESSFUL
      )
    );
  } catch (error) {
    throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
    
  }
});


export { registerUser, loginUser, logoutUser, refreshAccessToken };
