import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        isFlexi: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate holidays on the same date for the same year
holidaySchema.index({ date: 1, year: 1 }, { unique: true });

const Holiday = mongoose.model('Holiday', holidaySchema);
export default Holiday;
