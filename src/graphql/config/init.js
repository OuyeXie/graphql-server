'use strict'

var debug = require('debug')
var objectAssign = require('react/lib/Object.assign')

var baseConfig = require('./all.json')
var env = process.env.NODE_ENV || 'development'

if (env === 'stage') {
    env = 'prerelease'
}

var config

try {
    config = require('./' + env + '.json')
}
catch (error) {
    debug('dev')('No specific configuration for env ' + env)
}

module.exports = objectAssign(baseConfig, config)
