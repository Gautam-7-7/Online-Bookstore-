const mongoose = require("mongoose");

const moderationReportSchema = new mongoose.Schema(
    {
        book: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Book",
            required: true,
            index: true
        },
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 500
        },
        type: {
            type: String,
            enum: ["user_report", "duplicate_isbn"],
            default: "user_report"
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "removed"],
            default: "pending",
            index: true
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        reviewerNote: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        }
    },
    { timestamps: true }
);

moderationReportSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model("ModerationReport", moderationReportSchema);
