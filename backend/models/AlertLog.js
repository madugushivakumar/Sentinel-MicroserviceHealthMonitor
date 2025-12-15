import mongoose from 'mongoose';

const alertLogSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  channel: {
    type: String,
    enum: ['slack', 'telegram', 'email', 'whatsapp'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  success: {
    type: Boolean,
    default: true
  },
  error: {
    type: String
  }
}, {
  timestamps: false
});

alertLogSchema.index({ timestamp: -1 });

export default mongoose.model('AlertLog', alertLogSchema);

