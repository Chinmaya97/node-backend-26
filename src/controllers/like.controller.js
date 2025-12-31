import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

async function toggle(modelField, value, userId) {
  const existing = await Like.findOne({ [modelField]: value, likedBy: userId });

  if (existing) {
    await Like.findByIdAndDelete(existing._id);
    return false;
  }

  await Like.create({ [modelField]: value, likedBy: userId });
  return true;
}

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const liked = await toggle("video", videoId, req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { liked }, "Video like toggled"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const liked = await toggle("comment", commentId, req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { liked }, "Comment like toggled"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const liked = await toggle("tweet", tweetId, req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, { liked }, "Tweet like toggled"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const likes = await Like.find({ likedBy: req.user._id, video: { $ne: null } })
    .populate("video");

  return res
    .status(200)
    .json(new ApiResponse(200, likes, "Liked videos fetched"));
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
};
