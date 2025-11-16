import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    // // TODO: create playlist

    if (!name || name.trim() === "") {
        throw new ApiError(400, "Please provide a valid name");
    }

    if (!description || description.trim() === "") {
        throw new ApiError(400, "Please provide a valid description");
    }

    const playlist = await Playlist.create({
        name,
        description,
        videos: [],
        owner: req.user._id,
    });

    if (!playlist) {
        throw new ApiError(
            500,
            "Something went wrong while creating the playlist"
        );
    }

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    // // TODO: get user playlists

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Please provide a valid user id");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $match: {
                            isPublished: true,
                        },
                    },
                    {
                        $project: {
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                videoCount: {
                    $size: "$videoDetails",
                },
                totalDuration: {
                    $sum: "$videoDetails.duration",
                },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                videoCount: 1,
                totalDuration: 1,
                videos: "$videoDetails",
                createdAt: 1,
                updatedAt: 1,
            },
        },
        {
            $sort: { createdAt: -1 },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlists,
                "User playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // // TODO: get playlist by id

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please provide a valid playlist id");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $match: {
                            $or: [
                                { isPublished: true },
                                {
                                    owner: new mongoose.Types.ObjectId(
                                        req.user?._id
                                    ),
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            owner: "$ownerDetails",
                            createdAt: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$ownerDetails",
        },
        {
            $addFields: {
                videoCount: { $size: "$videoDetails" },
                totalDuration: { $sum: "$videoDetails.duration" },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                videoCount: 1,
                totalDuration: 1,
                videos: "$videoDetails",
                owner: "$ownerDetails",
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);

    if (!playlist || playlist.length === 0) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please provide a valid playlist id");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const [video, playlist] = await Promise.all([
        Video.findById(videoId),
        Playlist.findById(playlistId),
    ]);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to modify this playlist"
        );
    }

    // Check video publish status
    if (
        !video.isPublished &&
        video.owner.toString() !== req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "Cannot add unpublished videos from other users"
        );
    }

    if (playlist.videos.some((v) => v.toString() === videoId)) {
        throw new ApiError(400, "Video already exists in this playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $addToSet: { videos: videoId } },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video added to playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    // // TODO: remove video from playlist
    // // check if playlist and video exist
    // // check if user is the owner of the playlist
    // // check if video exist in playlist
    // // remove the video

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please provide a valid playlist id");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
            videos: videoId,
        },
        {
            $pull: { videos: videoId },
        },
        {
            new: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(
            404,
            "Playlist not found, you're not authorized, or video doesn't exist in playlist"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Video removed from the  playlist successfully"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // // TODO: delete playlist
    // // check if it exists and if the owner made the request

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please provide a valid playlist id");
    }

    const delResult = await Playlist.deleteOne({
        _id: playlistId,
        owner: req.user._id,
    });

    if (delResult.deletedCount < 1) {
        throw new ApiError(
            404,
            "Playlist not found or you are not authorized to delete it"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Please provide a valid playlist id");
    }

    if (
        (name === undefined || name.trim() === "") &&
        description === undefined
    ) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    // Build update object
    const updateFields = {};

    if (name !== undefined) {
        const trimmedName = name.trim();
        if (trimmedName === "") {
            throw new ApiError(400, "Name cannot be empty");
        }
        updateFields.name = trimmedName;
    }

    // Allow empty description (user might want to clear it)
    if (description !== undefined) {
        updateFields.description = description.trim();
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user._id,
        },
        {
            $set: updateFields,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(
            404,
            "Playlist not found or you are not authorized to update it"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Playlist updated successfully"
            )
        );
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
