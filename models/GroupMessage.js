const mongoose = require("mongoose");

const GroupMessageSchema = new mongoose.Schema({
    from_user: {
        type: String,
        required: true
    },
    room: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    date_sent: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model("GroupMessage", GroupMessageSchema, "GroupMessages");