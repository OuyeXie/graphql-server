require('babel/register')

var debug = require('debug')
debug.enable('server*')

require('./server')
