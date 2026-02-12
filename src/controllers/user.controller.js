import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccesAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAcessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false})

        return {accessToken, refreshToken}
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and acces token")
    }
}

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
    //console.log("email: " ,email)

    // if(fullname === ""){
    //     throw new ApiError(400, "fullname is required")
    // }

    if (
        [fullname, email, username, password].some( (field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "all fields are required")
    }

  const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existingUser){
        throw new ApiError(409, "User with email/username laready exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    //console.log(req.files)
    //console.log(avatarLocalPath);
    
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar || !avatar.url){
        throw new ApiError(400, "Avatar is unsuccessfully uploaded")
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

const loginUser = asyncHandler( async (req, res)=> {
    // req body se data lo
    // make email/username as base(valid credential)
    // find the user using the provided credentials
    // check the password
    // generate access and refresh token and give it to user
    //send cookies(with token in it) and response(login succesfull)
console.log("User routes loaded")
    const {email, username, password} = req.body
console.log(req.body)
    if(!(username || email)) {
        throw new ApiError(400, "username/email and password is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "user not found")
    }

    const isPasswordvalid = await user.isPasswordCorrect(password)

    if (!isPasswordvalid) {
        throw new ApiError(401, "invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccesAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refereshToken")

   const options = {
    httpOnly: true,
    secure: true
   }

   return res
   .status(200)
   .cookie("accesstoken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
        200, 
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "user logged in successfully"
    )
   )

})

const logoutUser = asyncHandler(async (req, res) => {
    //clear cookies aND ACCESS TOKEN
   await  User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        }, {
            new: true
        }
    )
    const options = {
    httpOnly: true,
    secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged out"))
    
} )

const refreshAccessToken = asyncHandler( async (req, res) => {
    // once the access token is expired, get the refresh token from user then update both the refresh token and access token with fresh ones 
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised request")
    }

    try {
        const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if(!user){
        throw new ApiError(401, "Invalid refresh token")
    }

    if(incomingRefreshToken !== user.refreshToken){
        throw new ApiError(401, "RefreshToken is expire")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccesAndRefreshTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "Access token refreshed successfully"

        )
    )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
 }