const mongoose = require('mongoose');
const { Schema } = mongoose;

const turfSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    pricePerHour: {
      type: Number,
      default: 0,
    },
    
    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
          },
          message: 'coordinates must be an array of [longitude, latitude]',
        },
      },
    },
    
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
  },
  { timestamps: true }
);

turfSchema.index({ geoLocation: '2dsphere' });

module.exports = mongoose.model('Turf', turfSchema);
