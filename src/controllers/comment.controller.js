import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
    // // TODO: get all comments for a video
    // // TODO: get the owner info for each comment
    // // TODO: get the likes and isLiked on each comment
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid video id");
    }

    if (isNaN(parseInt(page)) || isNaN(parseInt(limit))) {
        throw new ApiError(400, "please provide a valid and page and limit");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $sort: { createdAt: -1 },
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
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes",
                },
                isLiked: {
                    $in: [
                        new mongoose.Types.ObjectId(req.user?._id),
                        "$likes.likedBy",
                    ],
                },
            },
        },
        {
            $project: {
                content: 1,
                video: 1,
                owner: {
                    username: 1,
                    avatar: 1,
                },
                likeCount: 1,
                isLiked: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    };

    const result = await Comment.aggregatePaginate(commentsAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    // // TODO: add a comment to a video

    const { content } = req.body;
    const { videoId } = req.params;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content missing!");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const video = Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video does not exist");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(500, "Something went wrong while adding comment");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, comment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    // // TODO: update a comment
    // // TODO: only update the content
    // // TODO: check if the request is coming from the owner of the comment

    const { content } = req.body;
    const { commentId } = req.params;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content missing!");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Please provide a valid comment id");
    }

    const comment = await Comment.findOne({
        _id: commentId,
        owner: req.user._id,
    });

    if (!comment) {
        throw new ApiError(
            404,
            "Comment either does not exist or you are not authorized to update it"
        );
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            content,
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(
            500,
            "Something went wrong while updating the comment"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully!"
            )
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    // // TODO: delete a comment
    // // TODO: only owner can delete the comment
    // TODO: delete the likes related to the comment

    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Please provide a valid comment id");
    }

    const comment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user._id,
    });

    if (!comment) {
        throw new ApiError(
            404,
            "Comment either does not exist or you are not authorized to delete it"
        );
    }

    //delete likes
    await Like.deleteMany({
        comment: commentId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, commentId, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
