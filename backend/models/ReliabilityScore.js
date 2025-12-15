import mongoose from 'mongoose';

const reliabilityScoreSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    unique: true,
    index: true
  },
  uptime: {
    type: Number,
    default: 0
  },
  p50Latency: {
    type: Number,
    default: 0
  },
  p95Latency: {
    type: Number,
    default: 0
  },
  p99Latency: {
    type: Number,
    default: 0
  },
  errorRate: {
    type: Number,
    default: 0
  },
  sloTarget: {
    type: Number,
    default: 99.9
  },
  status: {
    type: String,
    enum: ['PASS', 'FAIL'],
    default: 'PASS'
  },
  lastCalculated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('ReliabilityScore', reliabilityScoreSchema);

