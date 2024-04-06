import express from 'express'
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
const app = express();
const port = 3000;
const { Schema } = mongoose;
const Secretkey = 'FmrCJx3sdzRElzP';


function authenticationJWT(req,res,next){
    const authHeader = req.headers.authentication;
    if(authHeader){
        const userToken = authHeader.split(' ')[1];
        jwt.verify(userToken,Secretkey,(err,data)=>{
            if(err){
                res.status(403).json({'msg':'User authorization failed!!!'});
            }else{
                req.user = data;
                next();
            }
        }) 
    }else{
        res.status(403).json({'msg':'Login or signUp again'});
    }
}

app.use(express.json())

// Schemas:

const userSchema = new Schema({
    "username":String,
    "password":String,
    'email':String,
    'phoneNumber':Number,
    'age':Number,
    'posts':[{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    'followings':[{ type: mongoose.Schema.Types.ObjectId, ref: 'Following' }],
    'followers':[{ type: mongoose.Schema.Types.ObjectId, ref: 'Follower' }]
})

const postSchema = new Schema({
  'imageURL':String,
  'postBody':String,
  'likes':[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  'comments':[{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  'privatePost':Boolean,
})
const followingSchema = new Schema({
    'username':String,
    'date':Date,
})
const followerSchema = new Schema({
    'username':String,
    'data':Date
})

const commentSchema = new Schema({
    'username':String,
    'commentBody':String,
    'likes':[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]    
})



const User = mongoose.model('User',userSchema);
const Post = mongoose.model('Post',postSchema);
const Following = mongoose.model('Following',followingSchema);
const Follower = mongoose.model('Follower',followerSchema);
const Comment = mongoose.model('Comment',commentSchema)
mongoose.connect('mongodb://localhost:27017/')



app.post('/signup',async(req,res)=>{
    const {username,password,email} = req.body;
    const userNameverify = await User.findOne({username})
    const userEmailVerify = await User.findOne({email})
    if(userNameverify){
        res.status(403).json({"msg":'UerName Already Exist'})
    }else if(userEmailVerify){
        res.status(403).json({"msg":'Email Already Exist'})
    }else{
        const token = jwt.sign({'username':username,'email':email},Secretkey,{expiresIn:'7days'})
        console.log(username+" <-> " +email +" <-> " +password + " <-> " +token)
        const newUser = new User({'username':username,'password':password,'email':email})
        await newUser.save();
        res.status(200).json({'msg':'User has been created',"token":token})
    }
})

app.post('/login',async (req,res)=>{
   const {username,password} = req.body;
   const userNameverify = await User.findOne({username , password})
//    const userEmailVerify = await User.findOne({email,password})

   if( userNameverify){
    const userEmail = userNameverify.email;
    const token = jwt.sign({'username':username,'email':userEmail},Secretkey,{expiresIn:'7days'})
    console.log(username+" <-> " +userEmail +" <-> " +password + " <-> " +token)
    res.status(200).json({'msg':'User has been successfully logged in '})
   }else{
    res.status(403).json({'msg':'User authorization failed'});
   }
  
})

app.post('/UploadPost',authenticationJWT,async ( req,res)=>{
    const {imageURL,postBody} = req.body;
    const currUser = await User.findOne({'username':req.user.username})
    console.log(req.user.username)
    if(currUser){
    // currUser.posts.map(async(val)=>{
    //     const temp = await Post.findById(val._id)
    //     console.log(temp.imageURL)
    // })

    if(imageURL.length <3){
            res.status(401).json("Image length is too short or image is not found")
    }else{
        const newPost = new Post({
            imageURL,
            'privatePost':false,
            postBody
        })
        await newPost.save();
    
        currUser.posts.push(newPost);
        await currUser.save();
        
        res.status(200).json({"msg":"post uploaded successfully!"});    
    }
}else{
    res.status(403).json({"msg":"No User find!!"})
}
    
})

app.get('/',(req,res)=>{
    res.send("Manish kapoor")
})


app.listen(port,()=>{
    console.log("successfuly listening on Port number " +port)
})