import mongoose from 'mongoose';

const healthLogSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  latency: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['ok', 'degraded', 'down'],
    required: true
  },
  cpu: {
    type: Number,
    default: 0
  },
  memory: {
    type: Number,
    default: 0
  },
  responseCode: {
    type: Number
  },
  errorCount: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Compound index for efficient queries
healthLogSchema.index({ serviceId: 1, timestamp: -1 });
healthLogSchema.index({ timestamp: -1 });

export default mongoose.model('HealthLog', healthLogSchema);

