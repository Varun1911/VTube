import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const videos = Video.find();
})

const publishAVideo = asyncHandler(async (req, res) =>
{
    // TODO: get video, upload to cloudinary, create video
    const {title, description} = req.body;

    if (!title.trim() || !description.trim())
    {
        throw new ApiError(400, "Title and description are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

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
        duration: videoFile.duration,
        isPublished: true
    });

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));
})

const getVideoById = asyncHandler(async (req, res) => {
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

    console.log("thumbnail: " + thumbnail);
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