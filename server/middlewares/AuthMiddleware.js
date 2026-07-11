import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    // console.log(req.cookies);
    const token = req.cookies.jwt;
    // console.log("Token:", token);
    if (!token) {
        return res.status(401).send( "Unauthorized" );
    }
    jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
        if (err) {
            return res.status(403).send("Token is not valid");
        }
        req.userId = payload.userId;
        next();
    });
} 