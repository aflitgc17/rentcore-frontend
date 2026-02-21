import jwt from "jsonwebtoken";

export function signJwt(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}
