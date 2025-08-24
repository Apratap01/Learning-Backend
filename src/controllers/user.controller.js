import { response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { trusted } from "mongoose";
import jwt  from "jsonwebtoken";

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

   // Use this one of the filed is required

   if(!(username || email)){
      throw new ApiError(400, "Username email is required")
   }
   
   const user  = await User.findOne({
      $or: [{username},{email}]
   })

   // strict login

   // if(!(username && email)){
   //    throw new ApiError(400, "Both user and email is required")
   // }
   
   // const user = await User.findOne({ email, username });
   


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

   console.log("Logged In SUccessfully");

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

   console.log("logged out successfully");

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json({ message: "User logged out successfully" });
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   try {
      const incomingRefreshToken  = req.cookies?.refreshToken || req.body.refreshToken
   
      if(!incomingRefreshToken){
         throw new ApiError(401,"Unauthorized error")
      }
   
      const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
      )

   
      const user = await User.findById(decodedToken?._id)
   
      if(!user){
         throw new ApiError(401,"Invalid refresh token");
      }
   
      if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh Token is expired")
   
      }
   
      const {accessToken,refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id)
   
      const options = {
         httpOnly: true,
         secure: true
      }
   
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
         new ApiResponse (
            200,
            {
               accessToken,
               refreshToken: newRefreshToken
            },
            "Access Token Refreshed"
         )
      )
   } catch (error) {
      throw new ApiError(401,error?.message || "invalid refresh Token")
   }
   

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

   const {oldPassword, newPassword} = req.body;

   const user = User.findById(req.user?._id)

   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

   if(!isPasswordCorrect){
      throw new ApiError(400,"Invalid Old Password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json(new ApiResponse(200,{},"Password Changed Successfully"))
})


const getCurrentUser = asyncHandler(asyncHandler(async(req,res)=>{
   return res
   .status(200)
   .json(new ApiResponse(200, req.user,"Current User Fetched Successfully"))
}))

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body

    if (!fullname || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req,res)=>{
   
     const avatarLocalPath =  req.files?.path
     if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is missing")
     }

     const avatar = await uploadOnCloudinary(avatarLocalPath)

     if(!avatar.url){
            throw new ApiError(400, "Error while Uploading on avatar")
     }
     // TODO : Old image deleting
     const user = await User.findByIdAndUpdate(req.user?._id,
      {
         $set:{
            avatar: avatar.url
         }
      },
      {
         new:true
      }
     ).select("-password")

     return res
     .status(200)
     .json(new ApiResponse(200,user,"Avatar Updated"))

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
   const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
    
}