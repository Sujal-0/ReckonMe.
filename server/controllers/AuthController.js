import User from "../models/UserModel.js";
import QuestionBook from "../models/QuestionBookModel.js";
import MatchHistory from "../models/MatchHistoryModel.js";
import jwt from "jsonwebtoken";
import { compare } from "bcrypt";
import nodemailer from "nodemailer";

const maxAge = 3 * 24 * 60 * 60 * 1000; 

const createToken = (email, userId) => {
    return jwt.sign({email, userId}, process.env.JWT_KEY, {
        expiresIn: maxAge
    });
}

export const signup = async (request, response, next) => {
    try {
        const { username, email, password } = request.body;
        if (!username || !email || !password) {
            return response.status(400).send("Username, Email and password are required");
        }
        const upperUsername = username.toUpperCase();
        const user = await User.create({username: upperUsername, email, password});
        response.cookie("jwt", createToken(email, user.id), {
            maxAge,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        });
        return response.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                avatarSeed: user.avatarSeed,
            },
        });
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal server error");
    }
}


export const login = async (request, response, next) => {
  try {
    const { identifier, password } = request.body;

    if (!identifier || !password) {
      return response.status(400).send("Email/Username and password are required");
    }

    // Check if identifier looks like an email
    const query = identifier.includes("@")
      ? { email: identifier }
      : { username: { $regex: new RegExp(`^${identifier}$`, "i") } };

    const user = await User.findOne(query);
    if (!user) {
      return response.status(404).send("User not found");
    }

    const auth = await compare(password, user.password);
    if (!auth) {
      return response.status(400).send("Invalid credentials");
    }

    response.cookie("jwt", createToken(user.email, user.id), {
      maxAge,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    return response.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarSeed: user.avatarSeed,
      },
    });
  } catch (error) {
    console.log({ error });
    return response.status(500).send("Internal server error");
  }
};

export const getUserInfo = async (request, response, next) => {
    
    try {
        // console.log(request.userId);
        const userData = await User.findById(request.userId);
        if (!userData) {
            return response.status(404).send("User with this id not found");
        }
        return response.status(200).json({
            id: userData.id,
            email: userData.email,
            username: userData.username,
            avatarSeed: userData.avatarSeed,
            // createdAt: userData.createdAt,
        });
        
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal server error");
    }
}

export const updateProfile = async (request, response, next) => {
    try {
        const { userId } = request;
        const { username } = request.body;
        if (!username ) {
            return response.status(400).send("Please provide a username");
        }
        const userData = await User.findByIdAndUpdate(
            userId,
            { username },
            { new: true, runValidators: true }
        );
        
        return response.status(200).json({
            id: userData.id,
            email: userData.email,
            username: userData.username,
            avatarSeed: userData.avatarSeed,
            // createdAt: userData.createdAt,
        });
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal server error");
    }
}

export const updateAvatar = async (request, response, next) => {
    try {
        const { userId } = request;
        const { avatarSeed } = request.body;
        if (!avatarSeed ) {
            return response.status(400).send("Please provide an avatarSeed");
        }
        const userData = await User.findByIdAndUpdate(
            userId,
            { avatarSeed },
            { new: true, runValidators: true }
        );
        
        return response.status(200).json({
            id: userData.id,
            email: userData.email,
            username: userData.username,
            avatarSeed: userData.avatarSeed,
        });
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal server error");
    }
}

export const logout = async (request, response, next) => {
    try {
       response.cookie("jwt", "", {
            maxAge: 1,
            secure: true,
            sameSite: "None",
        });
        return response.status(200).send("Logged out successfully");
    } catch (error) {
        console.log({ error });
        return response.status(500).send("Internal server error");
    }
}

export const deleteAccount = async (request, response, next) => {
    try {
        const { userId } = request;
        const user = await User.findById(userId);
        if (!user) {
            return response.status(404).send("User not found");
        }

        // 1. Delete associated QuestionBooks
        await QuestionBook.deleteMany({ authorId: userId });

        // 2. Anonymize MatchHistory where this user was a player
        // (We do not delete the match, just replace their name and avatar)
        await MatchHistory.updateMany(
            { "players.id": userId },
            { 
                $set: { 
                    "players.$[elem].name": "Anonymous Player",
                    "players.$[elem].avatarSeed": "default"
                } 
            },
            { arrayFilters: [{ "elem.id": userId }] }
        );

        // 3. Delete the User
        await User.findByIdAndDelete(userId);

        // 4. Send Confirmation Email (Nodemailer styled)
        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS,
                },
            });

            const htmlTemplate = `
              <div style="font-family: Arial, sans-serif; background-color: #0A0A0A; color: #ffffff; padding: 40px; text-align: center; border-radius: 10px; max-width: 600px; margin: 0 auto; border: 4px solid #4D4C7D; box-shadow: 8px 8px 0px #4D4C7D;">
                <img src="https://reckonme.vercel.app/RMeLogo.png" alt="ReckonMe Logo" style="width: 150px; margin-bottom: 20px;" />
                <h1 style="color: #E48F45; text-transform: uppercase; letter-spacing: 2px;">Account Deleted</h1>
                <p style="font-size: 18px; color: #ffffff;">We're sad to see you go, ${user.username}.</p>
                
                <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 5px; text-align: left; margin: 30px 0; border: 2px solid rgba(255,255,255,0.1);">
                  <p style="margin: 0; line-height: 1.6;">Your ReckonMe! account and all associated personal data have been permanently deleted from our servers as requested.</p>
                </div>
                
                <a href="https://reckonme.vercel.app" style="display: inline-block; background-color: #00E5FF; color: #0A0A0A; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 16px; border: 2px solid #ffffff; box-shadow: 3px 3px 0px #ffffff; text-transform: uppercase;">
                  Return to Home
                </a>
              </div>
            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: "ReckonMe! Account Deleted",
                html: htmlTemplate,
            });
        } catch (mailError) {
            console.error("Failed to send deletion email:", mailError);
            // Non-fatal error, proceed to finish deletion process
        }

        // 5. Clear Auth Cookie
        response.cookie("jwt", "", {
            maxAge: 1,
            secure: true,
            sameSite: "None",
        });

        return response.status(200).json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
        console.error("Delete account error:", error);
        return response.status(500).send("Internal server error during deletion");
    }
}