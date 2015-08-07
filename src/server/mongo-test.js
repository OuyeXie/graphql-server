require('babel/register')
var mongo = require('./mongo')

//debug
if (require.main === module) {
    setTimeout(function () {
        console.info("construct successfully")
        mongo.connect()
            .then(function () {
                return mongo.findOne(mongo.rankRebalancingCollection, {rank: 0})
            }).then(function (_rank) {
                return _rank.symbol
            }).then(function (_symbol) {
                console.info(_symbol)
            })
            .then(function () {
                mongo.close()
            })
            .then(function () {
                console.info("finish")
            })
            .catch(function (err) {
                console.error(err)
            })
    }, 0)
}