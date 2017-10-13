var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var GroupSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: false,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    privacy: {
        type: String,
        required: true
    },
    admin: {
        type: String,
        required: false
    },
    members: []
});

/**
 * Statics
 */
GroupSchema.statics.load = function(id, cb) {
    this.findOne({
            _id: id
        })
        .exec(cb);
};

module.exports = mongoose.model('Group', GroupSchema);