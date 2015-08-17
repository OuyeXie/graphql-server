/**
 * Created by ouyexie on 7/16/15.
 */
'use strict'

import config from '../config/init'
import _ from 'lodash'
import mongo from 'mongodb'

var db = null
var host = config.mongodb.host
var port = config.mongodb.port
var database = config.mongodb.database

var Mongo = {

    rankRebalancingCollection: config.mongodb.rankRebalancingCollection,
    rankExternalUserCollection: config.mongodb.rankExternalUserCollection,
    rankStockCollection: config.mongodb.rankStockCollection,
    rebalancingCollection: config.mongodb.rebalancingCollection,
    externaluserCollection: config.mongodb.externaluserCollection,
    portfolioCollection: config.mongodb.portfolioCollection,

    connect: function () {
        return mongo.MongoClient.connect('mongodb://' + host + ':' + port + '/' + database)
            .then(function (_db) {
                db = _db
            }
        )
    },

    close: function () {
        return db.close()
    },

    find: function (collection, query) {
        if (_.isString(collection)) {
            collection = db.collection(collection)
        }

        return collection.find(query).toArray()
    },

    findOne: function (collection, query) {
        if (_.isString(collection)) {
            collection = db.collection(collection)
        }

        return collection.findOne(query)

    },

    findOneWithSort: function (collection, query, sortQuery) {
        if (_.isString(collection)) {
            collection = db.collection(collection)
        }

        return collection.findOne(query, {sort: sortQuery})
    },

    findLimitWithSort: function (collection, query, sortQuery, limit) {
        if (_.isString(collection)) {
            collection = db.collection(collection)
        }
        var cursor = collection.find(query)
        cursor = cursor.sort(sortQuery)
        cursor = cursor.limit(limit)
        var result = cursor.toArray()
        return result
    }
}

export default Mongo
