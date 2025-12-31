import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) throw new ApiError(400, "Tweet content required");

  const tweet = await Tweet.create({
    content,
    owner: req.user._id
  });

  logger.info("Tweet created", { id: tweet._id });

  return res.status(201).json(new ApiResponse(201, tweet, "Tweet created"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const tweets = await Tweet.find({ owner: req.user._id });

  logger.info("User tweets fetched");

  return res.status(200).json(new ApiResponse(200, tweets, "Tweets fetched"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  const tweet = await Tweet.findByIdAndUpdate(tweetId, { content }, { new: true });

  logger.info("Tweet updated", { tweetId });

  return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  await Tweet.findByIdAndDelete(tweetId);

  logger.info("Tweet deleted", { tweetId });

  return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
