import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const Secretkey =  process.env.SECRET_KEY   

const authenticationJWT = (req, res, next) =>{
    const authHeader = req.headers.authentication;
    if (authHeader) {
        const userToken = authHeader.split(' ')[1];
        jwt.verify(userToken, Secretkey, (err, data) => {
            if (err) {
                res.status(403).json({ 'msg': 'User authorization failed!!!' });
            } else {
                req.user = data;
                next();
            }
        })
    } else {
        res.status(403).json({ 'msg': 'Login or signUp again' });
    }
}

export {authenticationJWT}