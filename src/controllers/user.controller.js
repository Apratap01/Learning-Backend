import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
     // get user details from frontend
     // validation
     // check if user already exist
     // check for images, check for avatar
     // upload them to coudinary, avatar
     // create user Object - create entry db
     // remove password and refresh token field from response
     // check for user creation
     // return response


     const {fullname, email, username, password} = req.body
     console.log(fullname,"email",email)
     if(
        [fullname,email,username,password].some((field)=>
            field?.trim() ==="")
     ){
        throw new ApiError(400, "All fields are required")
     }

     const existedUser =await User.findOne({
        $or: [{ username } , { email }]
     })

     if(existedUser){
        throw new ApiError(409,"Useranme or account is used already")
     }

     const avtrLocalPath = req.files?.avatar[0]?.path;
     const covrImageLocalPath = req.files?.coverImage[0]?.path;

     if (!avtrLocalPath) {
        throw new ApiError(400, "Avatar file is required")
     }

     const avtr = await uploadOnCloudinary(avtrLocalPath);
     const covrimg = await uploadOnCloudinary(covrImageLocalPath);

     if(!avtr) throw new ApiError(
        400, "avtr is required"
     )
    
     const user = await User.create({
        fullname,
        avatar: avtr.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
     })

     const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
     )

     if(!createUser) {
        throw new ApiError(500,"Something went wrong while registerign the user")
     }

     return res.status(201).json(
        new ApiResponse(201, createUser, "user Registered Successfully")
     )

})

export {
    registerUser,
}