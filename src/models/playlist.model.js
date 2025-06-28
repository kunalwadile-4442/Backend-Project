import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema({
    name:{
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    video:{
        type: Schema.Types.ObjectId,
        ref: "Videos",
        required: true
    }
}, { timestamps: true });


playlistSchema.plugin(mongooseAggregatePaginate);

export const Playlist = mongoose.model("Playlist", playlistSchema);

