const mongoose = require('mongoose');
const { Schema } = mongoose;

const gameSchema = new Schema(
  {
    teamName: { type: String, required: true, trim: true },
    teamSize: { type: Number, required: true, min: 1 },
    gameType: { type: String, required: true, trim: true },
    turfLocation: { type: String, required: true, trim: true },
    turfDateTime: { type: Date, required: true },

    turfPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    geoLocation: {
      type: {
        type: String,
        enum: ['Point'],
        required: false,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: false,
        
        validate: {
          validator: function (v) {
            if (!v) return true;
            return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
          },
          message: 'coordinates must be an array of [longitude, latitude]',
        },
      },
    },

    players: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    captain: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    availableSpots: {
      type: Number,
      default: function () {
        return this.teamSize - this.players.length;
      },
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'finished', 'cancelled'],
      default: 'upcoming',
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);
gameSchema.index({ geoLocation: '2dsphere' });

gameSchema.pre('save', function () {
  this.availableSpots = this.teamSize - this.players.length;
  this.isOpen = this.availableSpots > 0 && this.status === 'upcoming';
});

module.exports = mongoose.model('Game', gameSchema);
