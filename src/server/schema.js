import {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLSchema,
    GraphQLString
} from 'graphql/type'

import Debug from 'debug'
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
                    return mongo.connect().then(function () {
                        return mongo.findOneWithSort(mongo.rankStockCollection, query, sortQuery)
                    }).then(function (_rank) {
                        return _rank.symbol
                    }).then(function(_symbol){
                        return {
                            symbol: _symbol,
                            name: 'NOTAVAILABLE'
                        }
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
