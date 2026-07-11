import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import { compare } from "bcrypt";

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
        const user = await User.create({username,email,password});
        response.cookie("jwt", createToken(email, user.id), {
            maxAge,
            secure: true,
            sameSite:"None",
        });
        return response.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
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
      : { username: identifier };

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
      secure: true,
      sameSite: "None",
    });

    return response.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
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
            // createdAt: userData.createdAt,
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