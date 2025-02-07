const mongoose = require("mongoose");
mongoose.connect(process.env.DB_URI);

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        posture: {
            type: Object,
            default:[]
        },
    }
);

const User = mongoose.model('users', userSchema);

module.exports=User