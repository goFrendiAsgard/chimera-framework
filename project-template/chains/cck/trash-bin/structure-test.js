var mongoose = require('mongoose')
var Schema = mongoose.Schema
var ObjectId = Schema.ObjectId
mongoose.Promise = global.Promise

var nodeTypeSchema = new Schema({
    name: {type: String, required: true, unique: true},
    inputTemplate: {type: String, required: true},
    getValueRule: {type: String} // anonymous function, return the real value (convert from String)
})
var NodeType = mongoose.model('NodeType', nodeTypeSchema)

var documentSchema = new Schema({
    name: {type: String, required: true, unique: true},
    rows: [{
        data: [Object],
        creationDate: {type: Date},
        creator: {type: ObjectId, ref: 'User'},
        modificationDate: {type: Date},
        modificator: {type: ObjectId, ref: 'User'},
        deleted: {type: Boolean},
        deleter: {type: ObjectId, ref: 'User'},
        histories: [{
            data: [Object],
            modificationDate: {type:Date}
        }]
    }], // the data, array of Object, the keys are name of node + _created_at, _created_by, _updated_at, and _updated_by
    nodes: [{
        name: {type: String, required: true},
        caption: {type: String, required: true},
        required: {type: Boolean},
        unique: {type: Boolean},
        nodeType: {type: ObjectId, ref: 'nodeType'},
        editRule: {type: String}, // anonymous function, take row, return boolean
        addRule: {type: String}, // anonymous function, take row, return boolean
        defaultValueRule: {type: String}, // anonymous function, take row, return string
        addOptionsRule: {type: String}, // anonymous function, return array or object containing options
        getOptionsRule: {type: String}, // anonymous function, return array or object containing options
        scoringRule: {type: String}, // anonymous function, take options, return number
    }],
    presentations: [{
        name: {type: String, required: true},
        url: {type: String, required: true},
        rowTemplate: {type: String},
        stringTemplate: {type: String},
    }],
    deleteRule: {type: String},
    addRule: {type: String},
})
var Document = mongoose.model('Document', documentSchema)
