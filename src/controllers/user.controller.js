import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { trusted } from "mongoose";

const generateAccessAndRefreshToken = async(userId)=>{
   try {
      const user = await User.findById(userId);
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})

      return {accessToken,refreshToken}
   } catch (error) {
      throw new ApiError(500,"SOmething wnt wrong while generating Tokens")
   }
}

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
    //  const covrImageLocalPath = req.files?.coverImage[0]?.path;

    let covrImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        covrImageLocalPath = req.files.coverImage[0].path
    }

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
        coverImage: covrimg?.url || "",
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

const loginUser = asyncHandler(async (req,res) => {
   // req data
   // find user
   // password check
   // acces refresh Token
   // send cookie

   const {email, username, password} = req.body;

   if(!(username || email)){
      throw new ApiError(400, "Username email is required")
   }

   const user  = await User.findOne({
      $or: [{username},{email}]
   })

   if(!user){
      throw new ApiError(400," USer is not Registered")
   }

   const isPasswordValid = await user.isPasswordCorrect(password);

   if(!isPasswordValid) throw new ApiError(400,"Invalid User Credentials")


   const {accessToken,refreshToken} = await  generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
   
   const options = {
      httpOnly : true,
      secure: true
   }

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
      new ApiResponse (
         200,
         {
            user: loggedInUser, accessToken,
            refreshToken
         },
         "User Logged in Succesfully"
      )
   )
})

const logoutUser = asyncHandler(async(req,res)=> {
   await User.findByIdAndUpdate(req.user._id,
      {
         $set: {
            refreshToken: undefined
         }
      }
   )

   const options = {
      httpOnly : true,
      secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
})

export {
    registerUser,
    loginUser,
    logoutUser
}