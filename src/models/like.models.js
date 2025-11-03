import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema({
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    }
}, {timestamps: true});


likeSchema.pre("validate", function (next) {
  const targets = [this.comment, this.video, this.tweet].filter(item => item);

  if (targets.length !== 1) {
    return next(
      new Error("Exactly one of 'comment', 'video', or 'tweet' must be provided.")
    );
  }

  next();
});

export const Like = mongoose.model("Like", likeSchema);