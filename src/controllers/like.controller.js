import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid video id");
    }

    // Try to delete the like
    const result = await Like.deleteOne({
        video: videoId,
        likedBy: req.user._id,
    });

    let isLiked;

    if (result.deletedCount > 0) {
        // Successfully deleted (unliked)
        isLiked = false;
    } else {
        // Nothing deleted, so create new like (liked)
        await Like.create({
            video: videoId,
            likedBy: req.user._id,
        });
        isLiked = true;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { isLiked }, "Video like toggled successfully")
        );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Please provide a valid comment id");
    }

    const result = await Like.deleteOne({
        comment: commentId,
        likedBy: req.user._id,
    });

    let isLiked;
    if (result.deletedCount > 0) {
        isLiked = false;
    } else {
        await Like.create({
            comment: commentId,
            likedBy: req.user._id,
        });

        isLiked = true;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isLiked },
                "Comment like toggled successfully"
            )
        );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    //TODO: toggle like on tweet

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Please provide a valid tweet id");
    }

    const result = await Like.deleteOne({
        tweet: tweetId,
        likedBy: req.user._id,
    });

    let isLiked;
    if (result.deletedCount > 0) {
        isLiked = false;
    } else {
        await Like.create({
            tweet: tweetId,
            likedBy: req.user._id,
        });

        isLiked = true;
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { isLiked }, "Tweet like toggled successfully")
        );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    // // TODO: get all liked videos
    const likedVideos = await Like.find({
        likedBy: req.user._id,
        video: { $ne: null },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully"
            )
        );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
