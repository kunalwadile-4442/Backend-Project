import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    videos:{
        type: Schema.Types.ObjectId,
        ref: "Videos",
    },
    likeBy:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tweet:{
        type: Schema.Types.ObjectId,
        ref: "Tweet",
    }
  },
  { timestamps: true }
);

export const Like = mongoose.model("Like", likeSchema);
