import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { userInfo } from "os";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Please provide valid content");
    }

    const userId = req.user._id;

    const tweet = await Tweet.create({
        content,
        owner: userId,
    });

    if (!tweet) {
        throw new ApiError(500, "Something went wrong while creating tweet");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Please provide a valid user id");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $project: {
                "owner.password": 0,
                "owner.email": 0,
                "owner.coverImage": 0,
                "owner.watchHistory": 0,
                "owner.refreshToken": 0,
                "owner.createdAt": 0,
                "owner.updatedAt": 0,
            },
        },
    ]);

    console.log(tweets);

    if (tweets.length === 0) {
        throw new ApiError(404, "No tweets found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets retrieved successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Please provide valid content");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Please provide a valide tweet id");
    }

    const tweet = await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user._id,
        },
        {
            content,
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!tweet) {
        throw new ApiError(
            500,
            "Something went wrong while updating the tweet"
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Please provide a valide tweet id");
    }

    const deleteResult = await Tweet.deleteOne({
        _id: tweetId,
        owner: req.user._id,
    });

    if (deleteResult.deletedCount < 1) {
        throw new ApiError(
            404,
            "Tweet either doesn't exist or you are not authorized to delete it"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { tweetId: tweetId },
                "Tweet deleted successfully"
            )
        );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
