import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    // get total videos
    // total views
    // total subscribers
    // total likes
    // total comments

    const totalVideos = await Video.countDocuments({
        owner: req.user._id,
    });

    // const totalViews = await

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { totalVideos },
                "Channel stats fetched successfully"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
});

export { getChannelStats, getChannelVideos };
