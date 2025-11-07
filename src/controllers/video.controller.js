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
        if (!mongoose.Types.ObjectId.isValid(userId))
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
    // get video details
    // get likes and comments
    // get owner details 
    // add to users watch history
    // increase video view count
    
    const { videoId } = req.params
    //TODO: get video by id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId))
    {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const video = await Video.findById(videoId);

    if (!video)
    {
        throw new ApiError(404, "Video with given id does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId))
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
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    // only owner can delete the video
    // also delete all comments, likes related to the video

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId))
    {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const video = await Video.findByIdAndDelete(videoId);

    if (!video)
    {
        throw new ApiError(400, "Video does not exist");
    }

    return res
        .status(200)
        .json(200, {videoId: videoId}, "Video deleted successfully!");
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //only owner can toggle publish status

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId))
    {
        throw new ApiError(400, "Please provide a valid video id");
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        [
            {$set: {isPublished: {$not: "$isPublished"}}}
        ],
        {
            new: true
        }
    );

    if (!video)
    {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video publish status updated usccessfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}