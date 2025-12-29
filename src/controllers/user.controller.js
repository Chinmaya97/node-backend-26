import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  logger.info("Register attempt", { email, username });

  const exist = await User.findOne({ $or: [{ email }, { username }] });
  if (exist) throw new ApiError(409, "Email or username already exists");

  const avatarPath = req.files?.avatar?.[0]?.path;
  const coverImagePath = req.files?.coverImage?.[0]?.path;
 

  if (!avatarPath) throw new ApiError(400, "Avatar is required");

  // Upload avatar
  const avatar = await uploadOnCloudinary(avatarPath);
  if (!avatar || !avatar.secure_url) {
    throw new ApiError(500, "Avatar upload failed");
  }
  


  // Upload cover (optional)
  const cover = coverImagePath ? await uploadOnCloudinary(coverImagePath) : null;

  const user = await User.create({
    fullName,
    email,
    username,
    password,
    avatar: avatar.secure_url,
    coverImage: cover?.secure_url || "",
  });

  const createdUser = await User.findById(user._id).select("-password");
  if (!createdUser) {
    logger.error("User creation lookup failed", { id: user._id });
    throw new ApiError(500, "Something went wrong while creating user");
  }

  logger.info("User registered", { id: user._id });

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export { registerUser };
