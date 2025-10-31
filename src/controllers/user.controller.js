import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uplaodOnCloudinary as uplaodOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {

    // console.log("Request Body: ", req.body);
    //get user details from frontend 
    const { username, email, fullName, password } = req.body;

    //validation 
    if([fullName, email, username, password].some((field) => field?.trim() === ""))
    {
        throw new ApiError(400, "Required fields are missing");
    }

    //we can add other validations here too : password strength , email format , username format


    //check if user already exists : email , username
    const doesUserExist = await User.findOne({ 
        $or: [{ email }, { username }]
    });

    console.log("Does User Exist: ", doesUserExist);

    if(doesUserExist)
    {
        throw new ApiError(409, "User with given email or username already exists");
    }


    //check for images, check for avatar
    // console.log("Files: ", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
    {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    // console.log("Avatar Local Path: ", avatarLocalPath);    

    if(!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar image is required");
    }


    //upload them to cloudinary
    const avatar = await uplaodOnCloudinary(avatarLocalPath);
    const coverImage = await uplaodOnCloudinary(coverImageLocalPath);

    if(!avatar)
    {
        throw new ApiError(400, "Avatar image is required (colud)");
    }

    // console.log("Avatar Upload Response: ", avatar);
    // console.log("Cover Image Upload Response: ", coverImage);

    //create user object - create entry in db
    const user = await User.create({
        username : username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    // console.log("Created User: ", user);


    //check for user creation 
     //remove password and refresh token from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser)
    {
        throw new ApiError(500, "Unable to create user. Please try again later.");
    }
   
    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});

export { registerUser };
