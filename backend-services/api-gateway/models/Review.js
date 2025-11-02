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
    qualityOfService: {
        type: Number,
        min: 1, max: 5,
        required: true 
    },
    customerSupport: {
        type: Number,
        min: 1, max: 5,
        required: true 
    },
    onTimeDelivery: {
        type: Number,
        min: 1, max: 5,
        required: true 
    },
    valueForMoney: {
        type: Number,
        min: 1, max: 5,
        required: true 
    },
    communicationResponsiveness: {
        type: Number,
        min: 1, max: 5,
        required: true 
    },
    technicalExpertise: {
        type: Number,
        min: 1, max: 5,
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
    verificationStatus: { 
        type: String,
        enum: ['PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED'],
        default: 'PENDING'
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

ReviewSchema.virtual('overallRating').get(function() {
    // Only calculate if all six required rating fields are present
    if (this.qualityOfService && this.customerSupport && this.onTimeDelivery && 
        this.valueForMoney && this.communicationResponsiveness && this.technicalExpertise) {
        
        const sum = this.qualityOfService + this.customerSupport + this.onTimeDelivery + 
                    this.valueForMoney + this.communicationResponsiveness + this.technicalExpertise;
        
        // Return the average, rounded to 1 decimal place
        return (sum / 6).toFixed(1); 
    }
    return null; 
});

export default model('Review', ReviewSchema);