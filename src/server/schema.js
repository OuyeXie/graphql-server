import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLSchema,
    GraphQLString,
    GraphQLInt,
    GraphQLFloat,
    GraphQLList
} from 'graphql/type'

import Debug from 'debug'
import moment from 'moment'
import mongo from './mongo'
import config from '../config/init'
import Random from 'random-js'

var debug = new Debug('server:schema')

/**
 * generate projection object for mongoose
 * @param  {Object} fieldASTs
 * @return {Project}
 */
export function getProjection(fieldASTs) {
    if (fieldASTs.selectionSet) {
        return fieldASTs.selectionSet.selections.reduce((projections, selection) => {
            projections[selection.name.value] = 1
            debug(selection.name.value)
            return projections
        }, {})
    }
    else {
        return {}
    }
}

var userType = new GraphQLObjectType({
    name: 'user',
    description: 'user creator',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            description: 'id of user.'
        },
        name: {
            type: GraphQLString,
            description: 'name of user.'
        }
    })
})

var stockType = new GraphQLObjectType({
    name: 'stock',
    description: 'stock creator',
    fields: () => ({
        symbol: {
            type: new GraphQLNonNull(GraphQLString),
            description: 'symbol of stock.'
        },
        name: {
            type: GraphQLString,
            description: 'name of stock.'
        }
    })
})

var userRankType = new GraphQLObjectType({
    name: 'user_rank',
    description: 'user rank',
    fields: () => ({
        _id: {
            type: new GraphQLNonNull(GraphQLString),
            description: 'id of record.'
        },
        id: {
            type: GraphQLString,
            description: 'id of user.'
        },
        name: {
            type: GraphQLString,
            description: 'name of user.'
        },
        rank: {
            type: GraphQLInt,
            description: 'rank of user.'
        },
        score: {
            type: GraphQLFloat,
            description: 'score of user.'
        }
    })
})

var schema = new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'query',
        fields: {
            hello: {
                type: GraphQLString,
                resolve: () => {
                    return 'world'
                }
            },
            user: {
                type: userType,
                args: {
                    id: {
                        name: 'id',
                        type: new GraphQLNonNull(GraphQLString)
                    }
                },
                resolve: (root, {id}) => {
                    return {
                        id: id,
                        name: 'asdf'
                    }
                }
            },
            shake_from_rank_stock: {
                type: stockType,
                resolve: () => {
                    var max = config.randomMaxForRankStock || 50
                    var randomValue = (new Random()).integer(1, max)
                    var query = {rank: randomValue}
                    var sortQuery = [['ts', -1]]
                    return mongo.findOneWithSort(mongo.rankStockCollection, query, sortQuery)
                        .then(function (_rank) {
                            return _rank.symbol
                        }).then(function (_symbol) {
                            return {
                                symbol: _symbol,
                                name: 'NOTAVAILABLE'
                            }
                        }).catch(function (err) {
                            debug(err)
                            return null
                        })
                }
            },
            user_ranking: {
                type: new GraphQLList(userRankType),
                args: {
                    limit: {
                        name: 'limit',
                        type: GraphQLInt
                    }
                },
                //TODO: can be optimized by extract
                resolve: (root, {limit}) => {
                    limit = limit || 200
                    var now = moment().format('YYYY-MM-DD')
                    var query = {date: now}
                    // VERY IMPORTANT: SORTQUERY IS NOT WORKING IN THE FORMAT WHICH DOCUMENTS GIVE
                    var sortQuery = {'rank': 1}

                    return mongo.findLimitWithSort(mongo.rankExternalUserCollection, query, sortQuery, limit)
                    then(function (_rank) {
                        debug(_rank)
                        return _rank
                    }).catch(function (err) {
                        debug(err)
                        return null
                    })
                }
            }
        }
    })
})

export default schema
