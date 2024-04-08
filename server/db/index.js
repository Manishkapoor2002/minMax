import mongoose from 'mongoose';
const { Schema } = mongoose;
const userSchema = new Schema({
    "username": String,
    "password": String,
    'email': String,
    "profilePic":String,
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
    'likes': [],
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

export { User, Post, Comment };
