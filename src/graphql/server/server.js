import _ from 'lodash'
import express from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import Debug from 'debug'
import {graphql} from 'graphql'
import schema from './schema'
import mongo from './mongo'

var debug = new Debug('server:server')

// connect to mongodb
mongo.connect()
    .then(function () {
        debug('mongodb connect successfully')
    })
    .catch(function (err) {
        debug(err)
    })

let port = process.env.PORT || 3000
let router = new express.Router()
var app = express()

// accessing log
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prerelease') {
    app.use(morgan('combined'))
} else {
    app.use(morgan('dev'))
}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

router.use('/data', function (req, res) {
    var queryData = _.isEmpty(req.body) ? req.query : req.body
    var query = queryData.query
    var params = queryData.params
    debug(queryData)
    debug(query)
    debug(params)

    graphql(schema, query, '', params).then(function (_result) {
        debug(_result)
        res.send(_result)
    }).catch(function (err) {
        res.status(500).send()
        debug(err)
        throw err
    })
})

app.get('/ping', function (req, res) {
    res.send('pong').end()
})

app.use(router)

app.listen(port, () => {
    console.log('app is listening on ' + port)
})

module.exports = app

/*
 * before exit
 */

//so the program will not close instantly
//process.stdin.resume();

function exitHandler(options, err) {
    if (options.cleanup) debug('clean up before exit');
    if (err) debug(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));
