import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    //validation for the details provided by the user also not empty is checked
    //check if user already exists : check bye user name ans email
    //check for images, check fro avatars
    //upload them to cloudinary,avatar is succesfully uploaded or not
    //create user object - create entry in db
    //removepassword and refressh token field from response
    //check if use creation response has arrived or not
    //return the result

    const { fullname, email, username, password} = req.body
    console.log("email: " ,email)

    // if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    // }

    if (
        [fullname, email, username, password].some( (field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "all fields are required")
    }

  const existingUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if (existingUser){
        throw new ApiError(409, "User with email/username laready exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnClodinary(avatarLocalPath)
    const coverImage = await uploadOnClodinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar is required")
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Succesfully")
    )



})

export { registerUser }