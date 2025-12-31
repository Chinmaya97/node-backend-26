import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

// ---------------- CREATE PLAYLIST ----------------
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description)
    throw new ApiError(400, "Name & description required");

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  logger.info("Playlist created", { id: playlist._id });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

// ---------------- USER PLAYLISTS ----------------
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const playlists = await Playlist.find({ owner: userId });

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched"));
});

// ---------------- GET PLAYLIST ----------------
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const playlist = await Playlist.findById(playlistId).populate(
    "videos",
    "title thumbnail duration owner"
  );

  if (!playlist) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched"));
});

// ---------------- ADD VIDEO ----------------
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  logger.info("Video added to playlist", { playlistId, videoId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video added to playlist"));
});

// ---------------- REMOVE VIDEO ----------------
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video removed successfully"));
});

// ---------------- DELETE PLAYLIST ----------------
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

// ---------------- UPDATE PLAYLIST ----------------
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    { name, description },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
