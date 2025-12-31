import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";


// ---------------- TOKEN GENERATOR ----------------
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Token generation failed", { error: error.message });
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};


// ---------------- REGISTER ----------------
export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  logger.info("Register attempt", { email, username });

  const exist = await User.findOne({ $or: [{ email }, { username }] });
  if (exist) throw new ApiError(409, "Email or username already exists");

  const avatarPath = req.files?.avatar?.[0]?.path;
  const coverImagePath = req.files?.coverImage?.[0]?.path;

  if (!avatarPath) throw new ApiError(400, "Avatar is required");

  const avatar = await uploadOnCloudinary(avatarPath);
  if (!avatar || !avatar.secure_url) {
    logger.error("Avatar upload failed");
    throw new ApiError(500, "Avatar upload failed");
  }

  const cover = coverImagePath
    ? await uploadOnCloudinary(coverImagePath)
    : null;

  const user = await User.create({
    fullName,
    email,
    username,
    password,
    avatar: avatar.secure_url,
    coverImage: cover?.secure_url || "",
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    logger.error("User creation lookup failed", { id: user._id });
    throw new ApiError(500, "Something went wrong while creating user");
  }

  logger.info("User registered successfully", { id: user._id });

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});


// ---------------- LOGIN ----------------
export const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  logger.info("Login attempt", { email, username });

  if (!password && !email) {
    throw new ApiError(400, "Password or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(404, "User does not exist");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    logger.warn("Invalid password attempt", { userId: user._id });
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } =
    await generateAccessAndRefreshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  logger.info("User logged in", { id: user._id });

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});


// ---------------- LOGOUT ----------------
export const logoutUser = asyncHandler(async (req, res) => {
  logger.info("Logout attempt", { id: req.user._id });

  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  logger.info("User logged out", { id: req.user._id });

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});


// ---------------- REFRESH TOKEN ----------------
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken)
    throw new ApiError(401, "Unauthorized request");

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) throw new ApiError(401, "Invalid refresh token");

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token expired or reused");
    }

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    logger.info("Access token refreshed", { id: user._id });

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    logger.error("Refresh token failed", { error: error.message });
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});


// ---------------- CHANGE PASSWORD ----------------
export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect)
    throw new ApiError(400, "Invalid old password");

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  logger.info("Password changed", { id: user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});


// ---------------- CURRENT USER ----------------
export const getCurrentUser = asyncHandler(async (req, res) => {
  logger.info("Current user fetched", { id: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});


// ---------------- UPDATE ACCOUNT ----------------
export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email)
    throw new ApiError(400, "All fields are required");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { fullName, email } },
    { new: true }
  ).select("-password");

  logger.info("Account updated", { id: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account updated successfully"));
});


// ---------------- UPDATE AVATAR ----------------
export const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath)
    throw new ApiError(400, "Avatar file missing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.secure_url)
    throw new ApiError(400, "Avatar upload failed");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatar: avatar.secure_url } },
    { new: true }
  ).select("-password");

  logger.info("Avatar updated", { id: user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});


// ---------------- UPDATE COVER ----------------
export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover image missing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage?.secure_url)
    throw new ApiError(400, "Cover image upload failed");

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { coverImage: coverImage.secure_url } },
    { new: true }
  ).select("-password");

  logger.info("Cover image updated", { id: user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

// ---------------- USER CHANNEL PROFILE ----------------
export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  logger.info("Channel profile fetch attempt", { username });

  if (!username?.trim()) {
    logger.warn("Username missing in channel profile request");
    throw new ApiError(400, "username is missing");
  }

  try {
    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
          channelsSubscribedToCount: { $size: "$subscribedTo" },
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
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    if (!channel?.length) {
      logger.warn("Channel not found", { username });
      throw new ApiError(404, "channel does not exists");
    }

    logger.info("Channel profile fetched successfully", {
      username,
      id: channel[0]._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channel[0],
          "User channel fetched successfully"
        )
      );
  } catch (error) {
    logger.error("Error fetching channel profile", {
      username,
      error: error.message,
    });
    throw error;
  }
});


// ---------------- WATCH HISTORY ----------------
export const getWatchHistory = asyncHandler(async (req, res) => {
  logger.info("Watch history fetch attempt", { userId: req.user._id });

  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "videos",
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
                owner: { $first: "$owner" },
              },
            },
          ],
        },
      },
    ]);

    logger.info("Watch history fetched successfully", {
      userId: req.user._id,
      count: user?.[0]?.watchHistory?.length || 0,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
  } catch (error) {
    logger.error("Error fetching watch history", {
      userId: req.user._id,
      error: error.message,
    });
    throw error;
  }
});
