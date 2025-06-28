import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/apiResponse.js";
import { MESSAGES } from "../constants.js";
import jwt from "jsonwebtoken";
import { validateHeaderName } from "http";
import mongoose from "mongoose";

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

    const options = {
    httpOnly: true,
    secure: true,
  };

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  ); await generateAccessAndRefreshToken(user._id);

  //
  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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
  // saved as cookie
  // return res

  const { email, username, password } = req.body;
  if (!req.body) {
    throw new ApiError(400, MESSAGES.REQUEST_BODY_REQUIRED);
  }

  console.log("Req body", req.body);

  console.log("email", email);
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

  // const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
  //   user._id
  // );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    // .cookie("accessToken", accessToken, options)
    // .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken,
        message: MESSAGES.LOGIN_SUCCESSFUL,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
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
    req.cookie.refreshToken || req.body.refreshToken;

  if (!incommingRefreshToken) {
    throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
  }

  try {
    const decodedVerifyRefreshToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedVerifyRefreshToken) {
      throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
    }
    const user = await User.findById(decodedVerifyRefreshToken?._id);

    if (!user) {
      throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
    }
    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, MESSAGES.REFRESH_TOKEN_EXPIRED);
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          MESSAGES.REFRESH_TOKEN_SUCCESSFUL
        )
      );
  } catch (error) {
    throw new ApiError(401, MESSAGES.INVALID_REFRESH_TOKEN);
  }
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // confirm password
  // const { oldPassword , newPassword ,confirmPassword }= req.body;
  // if(!oldPassword || !newPassword, !confirmPassword){
  //   throw new ApiError(400, MESSAGES.OLD_NEW_PASSWORD_REQUIRED);
  // }
  // if(!(newPassword === confirmPassword)){
  //   throw new ApiError(400, MESSAGES.PASSWORDS_DO_NOT_MATCH);
  //   }
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, MESSAGES.OLD_NEW_PASSWORD_REQUIRED);
  }

  const user = await User.findOne(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, MESSAGES.INVALID_CURRENT_PASSWORD);
  }

  user.password = newPassword;

  await user.save({ validateHeaderName: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, MESSAGES.PASSWORD_CHANGED_SUCCESSFULLY));
});

// Get current user.  (if login )
// we user a middleuser and full user inject the req.user soo we get a full user in middleware
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, MESSAGES.CURRENT_USER_FETCHED_SUCCESSFULLY));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, MESSAGES.REQUIRED_FIELDS);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email: email.toLowerCase(),
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, MESSAGES.CURRENT_USER_UPDATED_SUCCESSFULLY));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, MESSAGES.AVATAR_REQUIRED);
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, MESSAGES.AVATAR_UPLOAD_FAILED);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        MESSAGES.CURRENT_USER_AVATAR_UPDATED_SUCCESSFULLY
      )
    );
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, MESSAGES.COVER_IMAGE_REQUIRED);
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage) {
    throw new ApiError(400, MESSAGES.COVER_IMAGE_UPLOAD_FAILED);
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage?.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, MESSAGES.COVER_IMAGE_UPDATED_SUCCESSFULLY)
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw new ApiError(400, MESSAGES.USERNAME_NOT_GETTED);
  }
  // User.find({ username}
  const channel = await User.aggregate([
    // all documents
    {
      $match: {
        username: username.toLowerCase(),
      },
    },
    // nexr srage i have only 1 document
    // get the subscriber count
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    // get the subscribers to this channel
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribersTo",
      },
    },
    // whole document find a channels and subscribers count
    {
      // $size is used to get the size of the array
      $addFields: {
        subscribersCount: { $size: "$subscribers" },
        channelSubscribersToCount: { $size: "$subscribersTo" },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelSubscribersToCount: 1,
        isSubscribed: 1,
        email: 1,
      },
    },
  ]);

  if (!channel || channel.length === 0) {
    throw new ApiError(404, MESSAGES.CHANNEL_DOES_NOT_EXIST);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        MESSAGES.CHANNEL_PROFILE_FETCHED_SUCCESSFULLY
      )
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "Videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        MESSAGES.WATCH_HISTORY_FETCHED_SUCCESSFULLY
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
