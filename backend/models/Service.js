import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  metricsUrl: {
    type: String,
    trim: true
  },
  group: {
    type: String,
    default: 'Default',
    trim: true
  },
  ownerEmail: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
serviceSchema.index({ projectId: 1, active: 1, createdAt: -1 });
serviceSchema.index({ projectId: 1, name: 1 }, { unique: true }); // Unique name per project

export default mongoose.model('Service', serviceSchema);

