import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['ServiceProvider', 'Admin'], 
        default: 'ServiceProvider' 
    },
});

export default model('User', UserSchema);