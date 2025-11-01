import { Schema, model } from 'mongoose';

const ReviewSchema = new Schema({
    clientProfile: { 
        type: Schema.Types.ObjectId, 
        ref: 'ClientProfile', // Links to the ClientProfile
        required: true 
    },
    submittedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', // Links to the reviewing ServiceProvider
        required: true 
    },
    reviewText: { 
        type: String, 
        required: true 
    },
    paymentDelayDays: { 
        type: Number, 
        default: 0 
    },
    invoiceUrl: { 
        type: String, 
        required: true // URL to the stored invoice (Cloudinary)
    },
    isInvoiceVerified: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

export default model('Review', ReviewSchema);