import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // // TODO: toggle subscription

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Please provide a valid channel ID");
    }

    const subscriptionResult = await Subscription.deleteOne({
        channel: channelId,
        subscriber: req.user._id,
    });

    let isSubscribed;

    if (subscriptionResult.deletedCount > 0) {
        isSubscribed = false;
    } else {
        isSubscribed = true;

        await Subscription.create({
            subscriber: req.user?._id,
            channel: channelId,
        });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isSubscribed },
                "Channel subscription toggled successfully"
            )
        );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Please provide a valid channel ID");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
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
            $unwind: "$subscriberDetails",
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
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
            $unwind: "$channelDetails",
        },
        {
            $group: {
                _id: "$channel",
                channel: { $first: "$channelDetails" },
                subscribers: {
                    $push: "$subscriberDetails",
                },
            },
        },
        {
            $project: {
                _id: 0,
                subscribers: 1,
                channel: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribers[0] || { channel: null, subscribers: [] },
                "Channel subscribers fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Please provide a valid subscriber ID");
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
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
            $unwind: "$subscriberDetails",
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
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
            $unwind: "$channelDetails",
        },
        {
            $group: {
                _id: "$subscriber",
                subscriber: { $first: "$subscriberDetails" },
                channels: {
                    $push: "$channelDetails",
                },
            },
        },
        {
            $project: {
                _id: 0,
                subscriber: 1,
                channels: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channels[0] || { subscriber: null, channels: [] },
                "Subscribed channels fetched successfully"
            )
        );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
