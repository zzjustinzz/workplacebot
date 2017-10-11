var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: false,
        index: true
    },
    userName: {
        type: String,
        required: true,
        unique: false,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        required: true,
        'default': true
    },
    emails: [],
    addresses: [],
    department: {
        type: String,
        required: false
    }
});

/**
 * Statics
 */
UserSchema.statics.load = function(id, cb) {
    this.findOne({
            _id: id
        })
        .exec(cb);
};

module.exports = mongoose.model('User', UserSchema);