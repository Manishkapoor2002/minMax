import express from 'express'
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import {User,Post,Comment} from './db/index.js' 
const app = express();
import {authenticationJWT} from './middleware/auth.js'
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'
dotenv.config();
const port = process.env.PORT || 5000
const Secretkey = process.env.SECRET_KEY

app.use(express.json())

mongoose.connect('mongodb://localhost:27017/')

app.post('/signup', async (req, res) => {
    const { username, password, email ,profilePic} = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = await bcrypt.hash(password,salt)
    const userNameverify = await User.findOne({ username })
    const userEmailVerify = await User.findOne({ email })
    if (userNameverify) {
        res.status(403).json({ "msg": 'UerName Already Exist' })
    } else if (userEmailVerify) {
        res.status(403).json({ "msg": 'Email Already Exist' })
    } else {
        const token = jwt.sign({ 'username': username, 'email': email }, Secretkey, { expiresIn: '7days' })
        // console.log(username + " <-> " + email + " <-> " + password + " <-> " + token)
        const newUser = new User({ 'username': username, 'password': hashedPassword, 'email': email, 'PrivateAccount': false,'profilePic':profilePic || "" })
        await newUser.save();
        res.status(200).json({ 'msg': 'User has been created', "token": token })
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userNameverify = await User.findOne({ username })

    if (userNameverify) {
        const check = await bcrypt.compare(password,userNameverify.password);
        if(check){
            const userEmail = userNameverify.email;
            const token = jwt.sign({ 'username': username, 'email': userEmail }, Secretkey, { expiresIn: '7days' })
            console.log(username + " <-> " + userEmail + " <-> " + password + " <-> " + token)
            res.status(200).json({ 'msg': 'User has been successfully logged in ' ,'token' :token})
        }else{
            res.status(403).json("Password is wrong!!!")
        }
    } else {
        res.status(403).json({ 'msg': 'User authorization failed' });
    }

})

app.post('/UploadPost', authenticationJWT, async (req, res) => {
    const { imageURL, postBody } = req.body;
    const currUser = await User.findOne({ 'username': req.user.username })
    console.log(req.user.username)
    if (currUser) {
        if (imageURL.length < 3) {
            res.status(401).json("Image length is too short or image is not found")
        } else {
            const newPost = new Post({
                imageURL,
                'privatePost': false,
                postBody
            })
            await newPost.save();

            currUser.posts.push(newPost);
            await currUser.save();

            res.status(200).json({ "msg": "post uploaded successfully!" });
        }
    } else {
        res.status(403).json({ "msg": "No User find!!" })
    }

})

app.get('/profile/:username', authenticationJWT, async (req, res) => {
    const user = await User.findOne({ 'username': req.params.username });
    const currUser = await User.findOne({'username':req.user.username});


    if(currUser){
        if (user) {
            const blockCurrUser = currUser.block.includes(user.username);
            const blockOtherUser = user.block.includes(currUser.username);
            if(!blockCurrUser && !blockOtherUser){
                res.status(200).json({
                    "username": user.username,
                    "email": user.email,
                    "profilePic":user.profilePic,
                    "posts": user.posts,
                    "followings": user.followings,
                    "followers": user.followers
                });
            }else{
                res.status(203).json({'msg':'Something went wrong','hint':'blocked!!'})
            }
           
        } else {
            res.status(403).json({ "msg": "User not found" })
        }
    }else{
        res.status(403).json({ "msg": "Please login again!!" })
    }
   
})


app.post('/follow/:username', authenticationJWT, async (req, res) => {
    const otherUser = await User.findOne({ 'username': req.params.username });
    const currUser = await User.findOne({ "username": req.user.username })


    if (currUser) {
        if (otherUser) {            
            const followArray = otherUser.followers;
            const verifyFollow = followArray.includes(currUser.username);


            if (otherUser.username == currUser.username) {
                    res.status(203).json({ "msg": "following yourself is not possible!!" })
            }else if(verifyFollow){
                res.status(403).json({"msg": currUser.username+ " are already follows the "+req.params.username})
            }else{ 

            const blockCurrUser = currUser.block.includes(otherUser.username);
            const blockOtherUser = otherUser.block.includes(currUser.username);

            if(!blockCurrUser && !blockOtherUser){
                otherUser.followers.push(currUser.username);
                await otherUser.save();
                currUser.followings.push(otherUser.username);
                await currUser.save();
                res.status(200).json({ "msg": "followed successfully!!" });
            }else{
                res.status(203).json({'msg':'Something went wrong','hint':'blocked!!'})
            }
              
            }

        } else {
            res.status(403).json({ "msg": "User not found!!" })
        }
    } else {
        res.status(403).json({ "msg": "Please login again!!" })
    }
})

app.get('/followings/:username',authenticationJWT, async (req,res)=>{
    const user =  await User.findOne({"username":req.params.username}).populate('followings');
    if(user){
        res.status(200).json({"Following" : user.followings || []})
    }else{
        console.log("admjshb")
        res.status(403).json("User Not Found!!")
    }
})

app.get('/followers/:username',authenticationJWT,async (req,res)=>{
    const user =  await User.findOne({"username":req.params.username}).populate('followers');;
    if(user){
        res.status(200).json({"Following" : user.followers || []})
    }else{
        console.log("admjshb")
        res.status(403).json("User Not Found!!")
    }
})

app.post('/block/:username',authenticationJWT,async(req,res)=>{
    const currUser = await User.findOne({"username":req.user.username});
    const otherUser = await User.findOne({"username":req.params.username});

    if(currUser){
        if(otherUser){
            const currUserFollow = currUser.followers;
            const currUserFollowing = currUser.followings;
            
            const verifyFollow = currUserFollow.includes(otherUser.username);
            const verifyFollowing = currUserFollowing.includes(otherUser.username);

            if(verifyFollowing){
                currUser.followings.pop(otherUser.username)
                otherUser.followers.pop(currUser.username)
            }

            if(verifyFollow){
                otherUser.followings.pop(currUser.username)
                currUser.followers.pop(otherUser.username)
            }

            currUser.block.push(otherUser.username);

            await currUser.save();
            await otherUser.save();

            res.status(200).json({"msg":"User has been block !!"})

        }else{
            res.status(403).json({"msg":"user Not Found"});
        }
    }else{
        res.status(403).json({"msg":"Login Again!!"})
    }
})


app.post('/unblock/:username',authenticationJWT,async (req,res)=>{
    const currUser = await User.findOne({'username':req.user.username});
    const otherUser = await User.findOne({'username':req.params.username})


    if(currUser){
        if(otherUser){
            const blockList = currUser.block;
            const verifyBlock = blockList.includes(req.params.username);
            if(verifyBlock){
                console.log(otherUser.username)
                currUser.block.pop(otherUser.username)
                await currUser.save()
                res.status(200).json({'msg':"User unblocked successfully!!!"})
            }else{
                res.status(203).json({'msg':'user is not blocked!!'})
            }
        }else{
            res.status(403).json({'msg':'User Not found!!'})
        }
    }else{
        res.status(403).json({'msg':'Something went wrong ,Please login again !!'})
    }
})


app.post('/comment/:postId',authenticationJWT,async (req,res)=>{
    const {commentBody,likes} = req.body;
    const currUser = await User.findOne({'username':req.user.username});
    const verify = await Post.findById(req.params.postId);
    
    
    if(currUser){

        if(verify){
            const newComment = new Comment({
                'username': currUser.username,
                commentBody,
                'likes':[]
            })
            await newComment.save();
            const posts = await Post.findById(req.params.postId)
             posts.comments.push(newComment);
             posts.save();
             res.status(200).json({'msg':'Comment successfully uploaded!!'})
        }else{
            res.status(403).json({'msg':'Post not found!!!!'})
        }  
    }else{
        res.status(403).json({'msg':'Please login agains!!'})
    }
})

app.post('/like/:postIdx',authenticationJWT,async (req,res)=>{
    const currUser = await User.findOne({'username':req.user.username});
    const post = await Post.findById(req.params.postIdx);
    if(currUser){
        if(post){
            const postArray = post.likes;
            const verifyLike = postArray.includes(currUser.username);

            if(verifyLike){
                post.likes.pop(currUser.username);
                await post.save();
                res.status(200).json({'msg':'Post disliked successfully!!!'})
            }else{
                post.likes.push(currUser.username);
                await post.save();
                res.status(200).json({'msg':'Post Likes successfully!!!'})

            }
        }else{
            res.status(403).json({'msg':'Post not found!!'})
        }
    }else{
        res.status(403).json({'msg':'Please login again!!'})
    }
})  


app.get('/search/:username',authenticationJWT,async (req,res)=>{
    const currUser = await User.findOne({'username':req.user.username});
    const findUser = await User.findOne({'username':req.params.username});

    if(currUser){
       if(findUser){
        res.status(200).json({'userID':findUser._id,'username':findUser.username,'ProfilePic':findUser.profilePic || ""})
       }else{
        res.status(403).json({'msg':'User not found!!!'})
       }
    }else{
        res.status(403).json({'msg':'Please login again!!'})
    }
})


app.post('/updateProfile',authenticationJWT,async (req,res)=>{
    const {newProfilePic,newPassWord,newPhoneNumber,newEmail} = req.body;
    const user = await User.findOne({'username':req.user.username});

    if(user){
        if(newProfilePic || newPassWord || newPhoneNumber || newEmail){
            user.profilePic = newProfilePic;
            user.password = newPassWord;
            user.phoneNumber = newPhoneNumber
            user.email = newEmail,
            await user.save();
            res.status(200).json({'msg':'Profile successfully updated!!!'})
        }else{
            res.status(200).json({'msg':'Everything is same as before!!!'})
        }
      
    }else{
        res.status(403).json({'msg':'Please log in again!!!'})
    }
})

app.get('/', (req, res) => {
    res.send("Manish kapoor")
})


app.listen(port, () => {
    console.log("successfuly listening on Port number " + port)
})

