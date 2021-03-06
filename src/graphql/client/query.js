import request from 'superagent'
import Debug from 'debug'

var debug = new Debug('client:query')
var userId = '559645cd1a38532d14349246'

request
    .get('http://localhost:3000/data')
    .query({
        query: `query user{
        hello,
        user(id: "${userId}") {
            id
            name
        }
    }`
    })
    .end(function (err, res) {
        debug(err || res.body)
    })

request
    .get('http://localhost:3000/data')
    .query({
        query: `query shake{
        shake_from_rank_stock{
            symbol
        }
    }`
    })
    .end(function (err, res) {
        debug(err || res.body)
    })

request
    .get('http://localhost:3000/data')
    .query({
        query: `query shake{
        shake_from_rank_stock{
            symbol
            name
        }
    }`
    })
    .end(function (err, res) {
        debug(err || res.body)
    })

request
    .get('http://localhost:3000/data')
    .query({
        query: `query user_rank{
        user_ranking{
            name
        }
    }`
    })
    .end(function (err, res) {
        debug(err || res.body)
        debug(res.body.data.user_ranking)
    })

request
    .get('http://localhost:3000/data')
    .query({
        query: `query user_rank{
        user_ranking(limit: 10) {
            _id
            id
            name
            rank
            score
        }
    }`
    })
    .end(function (err, res) {
        debug(err || res.body)
        debug(res.body.data.user_ranking)
    })
