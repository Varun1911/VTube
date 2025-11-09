import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const {page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId} = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Build match stage
    const match = {isPublished: true};

    if (userId)
    {
        if (!isValidObjectId(userId))
        {
            throw new ApiError(400, "Please provide a valid user id");
        }
        match.owner = new mongoose.Types.ObjectId(userId);
    }

    // Build optional Atlas Search stage
    let searchStage = null;
    if (query && query.trim() !== "")
    {
        const q = query.trim();
        searchStage = {
            $search: {
                index: "default",
                text: {
                    query: q,
                    path: ["title", "description"]
                }
            }
        };
    }

    const sortOrder = String(sortType).toLowerCase() === "asc" ? 1 : -1;
    const sortObj = {[sortBy]: sortOrder};

    // Get total count
    const countPipeline = [];
    if (searchStage)
    {
        countPipeline.push(searchStage);
    }
    countPipeline.push(
        {$match: match},
        {$count: "total"}
    );

    const countResult = await Video.aggregate(countPipeline);
    const totalVideos = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalVideos / limitNum);

    // Build main aggregation pipeline
    const pipeline = [];

    // Apply search stage first if requested
    if (searchStage)
    {
        pipeline.push(searchStage);
    }

    // Match published videos
    pipeline.push({$match: match});

    // Sort, skip, and limit
    pipeline.push(
        {$sort: sortObj},
        {$skip: skip},
        {$limit: limitNum}
    );

    // Lookup owner info
    pipeline.push({
        $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner"
        }
    });

    pipeline.push({$unwind: "$owner"});

    // Lookup subscribers for the owner
    pipeline.push({
        $lookup: {
            from: "subscriptions",
            localField: "owner._id",
            foreignField: "channel",
            as: "ownerSubscribers"
        }
    });

    // Add fields for subscriber count and isSubscribed
    pipeline.push({
        $addFields: {
            "owner.subscribersCount": {
                $size: "$ownerSubscribers"
            },
            "owner.isSubscribed": {
                $cond: {
                    if: req.user?._id,
                    then: {
                        $in: [req.user._id, "$ownerSubscribers.subscriber"]
                    },
                    else: false
                }
            }
        }
    });

    // Project only required fields
    pipeline.push({
        $project: {
            videoFile: 1,
            thumbnail: 1,
            title: 1,
            description: 1,
            duration: 1,
            views: 1,
            isPublished: 1,
            createdAt: 1,
            updatedAt: 1,
            owner: {
                _id: 1,
                fullName: 1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                isSubscribed: 1
            }
        }
    });

    const videos = await Video.aggregate(pipeline);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videos,
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        totalVideos,
                        totalPages,
                        hasNextPage: pageNum < totalPages,
                        hasPrevPage: pageNum > 1
                    }
                },
                "Videos fetched successfully"
            )
        );
});

const publishAVideo = asyncHandler(async (req, res) =>
{
    // TODO: get video, upload to cloudinary, create video
    const {title, description} = req.body;

    if (!title.trim() || !description.trim())
    {
        throw new ApiError(400, "Title and description are required");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath || !thumbnailLocalPath)
    {
        throw new ApiError(400, "Video file and thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail)
    {
        throw new ApiError(500, "Something went wrong while uploading the video");
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user._id,
        title,
        description,
        duration: videoFile.duration || 0,
        isPublished: true
    });

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    // // get video details 
    // // get likes and comments
    // // TODO - get owner details 
    // // TODO add to users watch history
    // // increase video view count
    
    const { videoId } = req.params
 
    if (!isValidObjectId(videoId))
    {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const pipeline = [];
    //get the video from id
    pipeline.push(
        {
            $match: {_id: new mongoose.Types.ObjectId(videoId), isPublished: true},
        },
      );


    // get likes count and isLiked
    pipeline.push(
        {
            $lookup : 
            {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes"},
                isLiked: {
                    $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"]
                }
            }
        },
    );

    // get comments on the video with owner's username and avatar and likes on the comment and if it is liked by the user.
    pipeline.push(
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    { $sort: { createdAt: -1 } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    { $unwind: "$owner"},
                    {
                        $lookup: 
                        {
                            from: "likes",
                            localField: "_id",
                            foreignField: "comment",
                            as: "likes"
                        }
                    },
                    {
                        $addFields: {
                            likesCount: {$size: "$likes"},
                            isLiked: {
                                $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedBy"]
                            }
                        }
                    },
                    {
                        $project: 
                        {   
                            "owner.username": 1,
                            "owner.avatar": 1,
                            likesCount: 1,
                            isLiked: 1,
                            content: 1,
                            createdAt: 1,
                            updatedAt: 1
                        }
                    }
                ]
            }
        }
    );
    

    //get owner info - fullName, avatar, subscriberCount, isSubscribed
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner._id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                "owner.subscribersCount": {
                    $size: "$subscribers"
                },
                "owner.isSubscribed": {
                    $in: [new mongoose.Types.ObjectId(req.user._id), "$subscribers.subscriber"]
                }
            }
        },
    );


    //final projection 
    pipeline.push(
        {
            $project: {
                likes:0,
                subscribers: 0,
                "owner.password": 0,
                "owner.refreshToken": 0,
                "owner.email": 0,
                "owner.watchHistory": 0,
                "owner.createdAt": 0,
                "owner.updatedAt": 0,
                "owner.__v": 0,
                "owner.username": 0,
                "owner.coverImage": 0
            }
        }
    )

    const video = await Video.aggregate(pipeline);
    console.log(video);

    if (!video || video.length === 0)
    {
        throw new ApiError(404, "Video does not exist");
    }


    //increase views
    await Video.findByIdAndUpdate(
    videoId, 
    { $inc: { views: 1} }
    );


    //add to user's watch history
    await User.findByIdAndUpdate(req.user._id, 
        {
            $push: {watchHistory: videoId}
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if (!isValidObjectId(videoId))
    {
        throw new ApiError(400, "Please provide a valid video id")
    }

    const {title, description} = req.body;

    const thumbnailLocalPath = req.file?.path;


    let thumbnail;
    if (thumbnailLocalPath)
    {
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    }

    const updateData = {};

    if (title && title.trim() !== "")
    {
        updateData.title = title;
    }

    if (description && description.trim() !== "")
    {
        updateData.description = description;
    }

    if (thumbnail)
    {
        updateData.thumbnail = thumbnail.url;
    }

    if (Object.keys(updateData).length === 0)
    {
        throw new ApiError(400, "No valid fields to update.");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {$set: updateData},
        {new: true}
    )

    if (!video)
    {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    // // TODO: delete video
    // // only owner can delete the video
    // also delete all comments, likes related to the video

    if (!isValidObjectId(videoId))
    {
        throw new ApiError(400, "Please provide a valid video id");
    }

    // * Can do this way as well
    // const video = await Video.findById(videoId);

    // if (!video)
    // {
    //     throw new ApiError(404, "Video does not exist");
    // }

    // if(video.owner?.toString() !== req.user._id.toString()){
    //     throw new ApiError(403, "You are not authorized to delete this video");
    // }

   const video = await Video.findOneAndDelete({
        _id: videoId,
        owner: req.user._id
    });

    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized");
    }

    //delete likes

    //delete comments 

    return res
        .status(200)
        .json(new ApiResponse(200, {videoId: videoId}, "Video deleted successfully!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const video = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: req.user._id  // Only update if user is owner
        },
        [
            { $set: { isPublished: { $not: "$isPublished" } } }
        ],
        {
            new: true
        }
    );

    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video publish status updated successfully"));
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}