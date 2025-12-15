import mongoose from 'mongoose';

const incidentSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['down', 'latency', 'error_rate'],
    required: true
  },
  severity: {
    type: String,
    enum: ['critical', 'warning', 'info'],
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: {
    type: Date
  },
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  details: {
    type: String
  }
}, {
  timestamps: true
});

incidentSchema.index({ resolved: 1, startedAt: -1 });

export default mongoose.model('Incident', incidentSchema);

