import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

// ================= GET ALL VIDEOS =================
const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

  logger.info("Fetching videos", { page, limit, query, sortBy, sortType, userId });

  const match = {
    isPublished: true,
    ...(query && { title: { $regex: query, $options: "i" } }),
    ...(userId && { owner: userId })
  };

  const videos = await Video.aggregatePaginate(
    Video.aggregate([{ $match: match }]),
    {
      page,
      limit,
      sort: { [sortBy]: sortType === "asc" ? 1 : -1 }
    }
  );

  logger.info("Videos fetched successfully", { total: videos?.docs?.length });

  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// ================= PUBLISH VIDEO =================
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  logger.info("Publishing video", { user: req.user?._id });

  if (!title || !description) throw new ApiError(400, "Title & description required");

  const videoFile = req.files?.videoFile?.[0]?.path;
  const thumbnail = req.files?.thumbnail?.[0]?.path;

  if (!videoFile || !thumbnail)
    throw new ApiError(400, "Video and thumbnail required");

  const uploadedVideo = await uploadOnCloudinary(videoFile);
  const uploadedThumb = await uploadOnCloudinary(thumbnail);

  const video = await Video.create({
    videoFile: uploadedVideo.secure_url,
    thumbnail: uploadedThumb.secure_url,
    title,
    description,
    duration: uploadedVideo.duration,
    owner: req.user._id
  });

  logger.info("Video uploaded successfully", { id: video._id });

  return res.status(201).json(new ApiResponse(201, video, "Video published successfully"));
});

// ================= GET VIDEO BY ID =================
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  logger.info("Video fetched", { videoId });

  return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));
});

// ================= UPDATE VIDEO =================
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

  const { title, description } = req.body;

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;

  if (req.file?.path) {
    const thumbnail = await uploadOnCloudinary(req.file.path);
    updateData.thumbnail = thumbnail.secure_url;
  }

  const video = await Video.findByIdAndUpdate(videoId, updateData, { new: true });

  logger.info("Video updated", { videoId });

  return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

// ================= DELETE VIDEO =================
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

  await Video.findByIdAndDelete(videoId);

  logger.info("Video deleted", { videoId });

  return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// ================= TOGGLE PUBLISH =================
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video id");

  const video = await Video.findById(videoId);
  video.isPublished = !video.isPublished;
  await video.save();

  logger.info("Video publish toggled", { videoId, status: video.isPublished });

  return res.status(200).json(new ApiResponse(200, video, "Publish status updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
};
