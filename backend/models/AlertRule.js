import mongoose from 'mongoose';

const alertRuleSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  rules: {
    notifyOnDown: {
      type: Boolean,
      default: true
    },
    notifyOnDegraded: {
      type: Boolean,
      default: true
    },
    notifyOnHighLatency: {
      type: Boolean,
      default: false
    },
    highLatencyThreshold: {
      type: Number,
      default: 1000 // ms
    },
    notifyOnHighErrorRate: {
      type: Boolean,
      default: false
    },
    highErrorRateThreshold: {
      type: Number,
      default: 5 // percentage
    },
    notifyOnSloViolation: {
      type: Boolean,
      default: true
    }
  },
  channels: {
    slack: {
      enabled: { type: Boolean, default: false },
      webhookUrl: { type: String, default: '' }
    },
    telegram: {
      enabled: { type: Boolean, default: false },
      botToken: { type: String, default: '' },
      chatId: { type: String, default: '' }
    },
    email: {
      enabled: { type: Boolean, default: false },
      recipients: [{ type: String }]
    },
    whatsapp: {
      enabled: { type: Boolean, default: false },
      phoneNumberId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      chatId: { type: String, default: '' }
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
alertRuleSchema.index({ serviceId: 1, enabled: 1 });
alertRuleSchema.index({ projectId: 1 });

export default mongoose.model('AlertRule', alertRuleSchema);

