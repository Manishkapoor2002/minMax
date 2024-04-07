import express from 'express'
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
const app = express();
const port = 3000;
const { Schema } = mongoose;
const Secretkey = 'FmrCJx3sdzRElzP';


function authenticationJWT(req, res, next) {
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

app.use(express.json())

// Schemas:

const userSchema = new Schema({
    "username": String,
    "password": String,
    'email': String,
    'phoneNumber': Number,
    "PrivateAccount": Boolean,
    'age': Number,
    'posts': [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    'followings': [],
    'followers': [],
    'block':[]
})

const postSchema = new Schema({
    'imageURL': String,
    'postBody': String,
    'likes': [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    'comments': [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    'privatePost': Boolean,
})


const commentSchema = new Schema({
    'username': String,
    'commentBody': String,
    'likes': []
})



const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Comment = mongoose.model('Comment', commentSchema)
mongoose.connect('mongodb://localhost:27017/')



app.post('/signup', async (req, res) => {
    const { username, password, email } = req.body;
    const userNameverify = await User.findOne({ username })
    const userEmailVerify = await User.findOne({ email })
    if (userNameverify) {
        res.status(403).json({ "msg": 'UerName Already Exist' })
    } else if (userEmailVerify) {
        res.status(403).json({ "msg": 'Email Already Exist' })
    } else {
        const token = jwt.sign({ 'username': username, 'email': email }, Secretkey, { expiresIn: '7days' })
        // console.log(username + " <-> " + email + " <-> " + password + " <-> " + token)
        const newUser = new User({ 'username': username, 'password': password, 'email': email, 'PrivateAccount': false })
        await newUser.save();
        res.status(200).json({ 'msg': 'User has been created', "token": token })
    }
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const userNameverify = await User.findOne({ username, password })
    //    const userEmailVerify = await User.findOne({email,password})

    if (userNameverify) {
        const userEmail = userNameverify.email;
        const token = jwt.sign({ 'username': username, 'email': userEmail }, Secretkey, { expiresIn: '7days' })
        console.log(username + " <-> " + userEmail + " <-> " + password + " <-> " + token)
        res.status(200).json({ 'msg': 'User has been successfully logged in ' ,'token' :token})
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
            const verify = followArray.includes(currUser.username);


            if (otherUser.username == currUser.username) {
                    res.status(203).json({ "msg": "following yourself is not possible!!" })
            }else if(verify){
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
            const verify = blockList.includes(req.params.username);
            if(verify){
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
app.get('/', (req, res) => {
    res.send("Manish kapoor")
})


app.listen(port, () => {
    console.log("successfuly listening on Port number " + port)
})

