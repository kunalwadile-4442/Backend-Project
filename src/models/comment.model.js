import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    content:{
        type: String,
        required: true,
        trim: true
    },
    videos: {
      type: Schema.Types.ObjectId,
      ref: "Videos",
      required: true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
  },
  { timestamps: true }
);
commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);

