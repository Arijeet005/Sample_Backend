import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError} from "../utils/ApiError.js";


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

    if(fullname === ""){
        throw new ApiError(400, "fullname is required")
    }


})

export { registerUser }