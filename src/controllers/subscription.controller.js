import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

// ---------------- TOGGLE SUBSCRIPTION ----------------
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel id");

  logger.info("Toggle subscription attempt", {
    userId: req.user._id,
    channelId,
  });

  const existing = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (existing) {
    await Subscription.findByIdAndDelete(existing._id);
    logger.info("Subscription removed", { channelId });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Unsubscribed successfully"));
  }

  await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });

  logger.info("Subscribed successfully", { channelId });

  return res
    .status(201)
    .json(new ApiResponse(201, {}, "Subscribed successfully"));
});

// ---------------- CHANNEL SUBSCRIBERS ----------------
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel id");

  logger.info("Fetching subscribers", { channelId });

  const subs = await Subscription.find({ channel: channelId }).populate(
    "subscriber",
    "fullName username avatar"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, subs, "Subscribers fetched successfully"));
});

// ---------------- SUBSCRIBED CHANNELS ----------------
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId))
    throw new ApiError(400, "Invalid subscriber id");

  logger.info("Fetching subscribed channels", { subscriberId });

  const channels = await Subscription.find({
    subscriber: subscriberId,
  }).populate("channel", "fullName username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, channels, "Subscribed channels fetched"));
});

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
};
