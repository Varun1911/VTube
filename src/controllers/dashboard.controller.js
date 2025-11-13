import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    // // get total videos
    // // total views
    // // total subscribers
    // // total likes
    // // total comments

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $group: {
                _id: "$owner",
                totalViews: { $sum: "$views" },
                totalVideos: { $sum: 1 },
            },
        },
    ]);

    const stats = videoStats[0] || { totalVideos: 0, totalViews: 0 };

    const totalSubscribers = await Subscription.countDocuments({
        channel: req.user._id,
    });

    // get total likes on videos, comments and tweets by the user separately
    const [totalLikes_Videos, totalLikes_Comments, totalLikes_Tweets] =
        await Promise.all([
            // Likes on videos
            Like.aggregate([
                {
                    $lookup: {
                        from: "videos",
                        localField: "video",
                        foreignField: "_id",
                        as: "videos",
                        pipeline: [
                            {
                                $match: {
                                    owner: new mongoose.Types.ObjectId(
                                        req.user._id
                                    ),
                                },
                            },
                        ],
                    },
                },
                {
                    $match: { videos: { $ne: [] } },
                },
                {
                    $count: "totalVideoLikes",
                },
            ]),

            Like.aggregate([
                {
                    $lookup: {
                        from: "comments",
                        localField: "comment",
                        foreignField: "_id",
                        as: "comments",
                        pipeline: [
                            {
                                $match: {
                                    owner: new mongoose.Types.ObjectId(
                                        req.user._id
                                    ),
                                },
                            },
                        ],
                    },
                },
                {
                    $match: { comments: { $ne: [] } },
                },
                {
                    $count: "totalCommentLikes",
                },
            ]),

            Like.aggregate([
                {
                    $lookup: {
                        from: "tweets",
                        localField: "tweet",
                        foreignField: "_id",
                        as: "tweets",
                        pipeline: [
                            {
                                $match: {
                                    owner: new mongoose.Types.ObjectId(
                                        req.user._id
                                    ),
                                },
                            },
                        ],
                    },
                },
                {
                    $match: { tweets: { $ne: [] } },
                },
                {
                    $count: "totalTweetLikes",
                },
            ]),
        ]);

    const likeStats = {
        totalVideoLikes: totalLikes_Videos[0]?.totalVideoLikes || 0,
        totalCommentLikes: totalLikes_Comments[0]?.totalCommentLikes || 0,
        totalTweetLikes: totalLikes_Tweets[0]?.totalTweetLikes || 0,
    };

    // total comments
    const totalComments = await Comment.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            owner: new mongoose.Types.ObjectId(req.user._id),
                        },
                    },
                ],
            },
        },
        {
            $match: { videos: { $ne: [] } },
        },
        {
            $count: "totalComments",
        },
    ]);

    const commentStats = totalComments[0]?.totalComments || 0;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                totalVideos: stats.totalVideos,
                totalViews: stats.totalViews,
                totalSubscribers,
                totalLikes: likeStats,
                totalComments: commentStats,
            },
            "Channel stats fetched successfully"
        )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // // TODO: Get all the videos uploaded by the channel

    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    if (!page || isNaN(parseInt(page))) {
        throw new ApiError(400, "Please provide a valid page number");
    }

    if (!limit || isNaN(parseInt(limit))) {
        throw new ApiError(400, "Please provide a valid page number");
    }

    const videos = Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(userId) },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    const paginationOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const result = await Video.aggregatePaginate(videos, paginationOptions);

    if (result.docs.length === 0 || !result.docs) {
        throw new ApiError(404, "No videos found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, result, "All videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
