import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  const totalVideos = await Video.countDocuments({ owner: channelId });
  const totalViews = await Video.aggregate([
    { $match: { owner: channelId } },
    { $group: { _id: null, views: { $sum: "$views" } } },
  ]);

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const totalLikes = await Like.countDocuments({});

  return res.status(200).json(
    new ApiResponse(200, {
      totalVideos,
      totalViews: totalViews?.[0]?.views || 0,
      totalSubscribers,
      totalLikes,
    })
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ owner: req.user._id });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched"));
});

export { getChannelStats, getChannelVideos };
