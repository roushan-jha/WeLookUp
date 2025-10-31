import { Schema, model } from 'mongoose';

const ClientProfileSchema = new Schema({
    companyName: { 
        type: String, 
        required: true, 
        unique: true 
    },
    gstin: { 
        type: String, 
        unique: true, 
        sparse: true // Allows multiple documents to have null GSTIN
    },
    riskScore: { 
        type: Number, 
        min: 1, 
        max: 10, 
        default: 5 
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    totalReviews: { 
        type: Number, 
        default: 0 
    }
});

export default model('ClientProfile', ClientProfileSchema);