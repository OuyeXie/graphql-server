var _ = require('lodash')
    , moment = require('moment')
    , Promise = require('bluebird')

var knex = require('knex')({
    client: 'mysql',
    connection: {
        host: 'rds8wzr99nop9ummzwi2h.mysql.rds.aliyuncs.com',
        user: 'sgp',
        password: 'shengupiao',
        database: 'stock',
        charset: 'utf8'
    }
})

var EXCHANGE = {
    SH: '001002',
    SZ: '001003',
    NEEQ: '001004',
    HK: '002001',
    NYSE: '101001',
    NASDAQ: '101002',
    AMEX: '101003'
}

var EXCHANGE_INVERT = _.invert(EXCHANGE)

var HISTORICAL_TABLE = {
    cn: 'tq_qt_skdailyprice',
    hk: 'tq_qt_hkskdailyprice',
    us: 'tq_qt_usskdailyprice',
    index: 'tq_qt_index'
}

var ADJUST_TABLE = {
    cn: 'tq_qt_skadjustqt',
    hk: 'tq_qt_hkskadjustqt'
}

var COL_DICT = {
    SYMBOL: 'symbol',
    EXCHANGE: 'exchange',
    TRADEDATE: 'date',
    LCLOSE: 'lastClose',
    TOPEN: 'open',
    TCLOSE: 'close',
    THIGH: 'high',
    TLOW: 'low',
    VOL: 'volume',
    SESNAME: 'name',
    SEENGNAME: 'enName',
    TOTALSHARE: 'totalShare',
    LISTSTATUS: 'ipoStatus',
    LISTDATE: 'ipoDate',
    LISTOPRICE: 'firstOpen',
    DELISTDATE: 'delistDate',
    DELISTCPRICE: 'delistPrice'
}

function isIndex(stock) {
    return stock.type === 'INDEX'
}

function isCNStock(stock) {
    return stock.type !== 'INDEX' && stock.country === 'CN' || stock.exchange === 'SZ' || stock.exchange === 'SH' || stock.exchange === 'NEEQ'
}

function isHKStock(stock) {
    return stock.country === 'HK' || stock.exchange === 'HK'
}

function isUSStock(stock) {
    return stock.country === 'US' || stock.exchange === 'NASDAQ' || stock.exchange === 'NYSE' || stock.exchange === 'AMEX'
}

// 转换字段名
function afterQuery(resData) {
    return resData.map(function (r) {
        var res = {}
        _.pairs(r).forEach(function (lst) {
            var k = lst[0]
                , v = lst[1]
            switch (k) {
                case 'TRADEDATE':
                case 'LISTDATE':
                case 'DELISTDATE':
                    res[COL_DICT[k]] = moment(v, 'YYYYMMDD').set({hours: 8}).toDate()
                    break
                case 'EXCHANGE':
                    res[COL_DICT[k]] = EXCHANGE_INVERT[v]
                    break
                default:
                    if (COL_DICT[k]) {
                        res[COL_DICT[k]] = v
                    }
                    break
            }
        })
        if (res.exchange === 'SH' || res.exchange === 'SZ') {
            res.symbol = res.exchange + res.symbol
        }
        return res
    })
}

/*
 * 将股票按不同国家分组
 *
 * @param {Array} stocks
 * @return {Object}: {
 *   cn: [...],
 *   hk: [...],
 *   us: [...],
 *   index: [...]
 * }
 */
function separateStocks(stocks) {
    var cn = []
        , hk = []
        , us = []
        , index = []

    stocks.forEach(function (stock) {
        if (isIndex(stock)) {
            index.push(stock)
        } else if (isCNStock(stock)) {
            cn.push(stock)
        } else if (isHKStock(stock)) {
            hk.push(stock)
        } else if (isUSStock(stock)) {
            us.push(stock)
        }
    })

    return {
        cn: cn,
        hk: hk,
        us: us,
        index: index
    }
}

/*
 * 查询单个股票的历史股价
 *
 * @param {String} country: 'cn', 'hk', 'us' or 'index'
 * @param {Object} stock: {symbol: , exchange: }
 * @param {moment} startDate
 * @param {moment} endDate
 * @return {Promise}: query result
 */
function queryHistoricalData(country, stock, startDate, endDate) {
    if (!stock) {
        return Promise.resolve([])
    }
    var table = HISTORICAL_TABLE[country]

    if (country === 'cn' || country === 'index') {
        // A 股及指数的历史数据表中没有 SYMBOL 列
        return knex
            .select('SYMBOL', 'tq_oa_stcode.EXCHANGE', 'TRADEDATE', 'LCLOSE', 'TOPEN', 'TCLOSE', 'THIGH', 'TLOW', 'VOL')
            .from('tq_oa_stcode')
            .joinRaw('inner join ' + table + ' use index (IDX_SECODE_TRADEDATE) on ' + table + '.SECODE=tq_oa_stcode.SECODE')
            .where(
            stock.exchange ? {
                'SYMBOL': stock.symbol,
                'tq_oa_stcode.EXCHANGE': EXCHANGE[stock.exchange]
            } : {
                'SYMBOL': stock.symbol
            }
        )
            .whereBetween('TRADEDATE', [startDate.format('YYYYMMDD'), endDate.format('YYYYMMDD')])
            .where('TCLOSE', '>', 0)

    } else {
        // 港股及美股数据
        return knex
            .select('SYMBOL', 'EXCHANGE', 'TRADEDATE', 'LCLOSE', 'TOPEN', 'TCLOSE', 'THIGH', 'TLOW', 'VOL')
            .from(table)
            .where('SYMBOL', stock.symbol)
            .whereBetween('TRADEDATE', [startDate.format('YYYYMMDD'), endDate.format('YYYYMMDD')])
            .where('TCLOSE', '>', 0)
    }
}

/*
 * 查询一个表中多支股票的历史股价
 *
 * @param {String} country: 'cn', 'hk', 'us' or 'index'
 * @param {Array} stock: [{symbol: , exchange: }, ...]
 * @param {moment} startDate
 * @param {moment} endDate
 * @return {Promise}: query result
 */
function queryHistoricalDataMulti(country, stocks, startDate, endDate) {
    if (!stocks || !stocks.length) {
        return Promise.resolve([])
    }
    var table = HISTORICAL_TABLE[country]
        , symbols = stocks.map(function (stock) {
            return stock.symbol
        })

    if (country === 'cn' || country === 'index') {
        var s = _.indexBy(stocks, function (stock) {
            return stock.exchange + stock.symbol
        })

        return knex
            .select('SYMBOL', 'tq_oa_stcode.EXCHANGE', 'TRADEDATE', 'LCLOSE', 'TOPEN', 'TCLOSE', 'THIGH', 'TLOW', 'VOL')
            .from('tq_oa_stcode')
            .joinRaw('inner join ' + table + ' use index (IDX_SECODE_TRADEDATE) on ' + table + '.SECODE=tq_oa_stcode.SECODE')
            .whereIn('SYMBOL', symbols)
            .whereBetween('TRADEDATE', [startDate.format('YYYYMMDD'), endDate.format('YYYYMMDD')])
            .where('TCLOSE', '>', 0)
            .then(function (res) {
                return res.filter(function (r) {
                    return s[EXCHANGE_INVERT[r.EXCHANGE] + r.SYMBOL]
                })
            })
    } else {
        return knex
            .select('SYMBOL', 'EXCHANGE', 'TRADEDATE', 'LCLOSE', 'TOPEN', 'TCLOSE', 'THIGH', 'TLOW', 'VOL')
            .from(table)
            .whereIn('SYMBOL', symbols)
            .whereBetween('TRADEDATE', [startDate.format('YYYYMMDD'), endDate.format('YYYYMMDD')])
            .where('TCLOSE', '>', 0)
    }
}

/*
 * 查询历史股价
 *
 * @param {Object or Array} stocks
 * @param {Date or moment} startDate
 * @param {Date or moment} endDate
 * @return {Promise}
 */
function historicalData(stocks, startDate, endDate) {
    if (!stocks) {
        return Promise.resolve([])
    }

    startDate = moment(startDate)
    endDate = moment(endDate)

    var ret
    if (_.isArray(stocks)) {
        var countries = separateStocks(stocks)

        var res
        ret = queryHistoricalDataMulti('cn', countries.cn, startDate, endDate)
            .then(function (cnRes) {
                res = cnRes
                return queryHistoricalDataMulti('hk', countries.hk, startDate, endDate)
            }).then(function (hkRes) {
                res = res.concat(hkRes)
                return queryHistoricalDataMulti('us', countries.us, startDate, endDate)
            }).then(function (usRes) {
                res = res.concat(usRes)
                return queryHistoricalDataMulti('index', countries.index, startDate, endDate)
            }).then(function (indexRes) {
                return res.concat(indexRes)
            })
    } else {
        if (isIndex(stocks)) {
            ret = queryHistoricalData('index', stocks, startDate, endDate)
        } else if (isCNStock(stocks)) {
            ret = queryHistoricalData('cn', stocks, startDate, endDate)
        } else if (isHKStock(stocks)) {
            ret = queryHistoricalData('hk', stocks, startDate, endDate)
        } else if (isUSStock(stocks)) {
            ret = queryHistoricalData('us', stocks, startDate, endDate)
        } else {
            ret = Promise.resolve([])
        }
    }

    return ret.then(afterQuery)
}


/* Adjust price */

function historicalAdjustDataCN(stocks, startDate, endDate) {
    if (!stocks) {
        return Promise.resolve([])
    }
    var prm

    if (_.isArray(stocks)) {
        if (!stocks.length) {
            return Promise.resolve([])
        }
        var s = _.indexBy(stocks, function (stock) {
            return stock.exchange + stock.symbol
        })

        prm = knex
            .select('SYMBOL', 'EXCHANGE', 'TRADEDATE', 'LCLOSE', 'TOPEN', 'TCLOSE', 'THIGH', 'TLOW', 'AADJUSTINGFACTOR')
            .from(ADJUST_TABLE.cn)
            .whereIn('SYMBOL', stocks.map(function (stock) {
                return stock.symbol
            }))
            .where('TRADEDATE', '>=', startDate.format('YYYYMMDD'))
            .where('TCLOSE', '>', 0)
            .orderBy('TRADEDATE', 'asc')
            .then(function (res) {
                return res.filter(function (r) {
                    return s[EXCHANGE_INVERT[r.EXCHANGE] + r.SYMBOL]
                })
            })
    } else {
        prm = knex
            .select('SYMBOL', 'EXCHANGE', 'TRADEDATE', 'LCLOSE', 'TOPEN', 'TCLOSE', 'THIGH', 'TLOW', 'AADJUSTINGFACTOR')
            .from(ADJUST_TABLE.cn)
            .where(
            stocks.exchange ? {
                'SYMBOL': stocks.symbol,
                'EXCHANGE': EXCHANGE[stocks.exchange]
            } : {
                'SYMBOL': stocks.symbol
            }
        )
            .where('TRADEDATE', '>=', moment(startDate).format('YYYYMMDD'))
            .where('TCLOSE', '>', 0)
            .orderBy('TRADEDATE', 'asc')
    }

    return prm.then(function (res) {
        var ret = []
        endDate = endDate.format('YYYYMMDD')
        res.forEach(function (r) {
            var exchange = EXCHANGE_INVERT[r.EXCHANGE]
            if (exchange === 'SH' || exchange === 'SZ') {
                r.SYMBOL = exchange + r.SYMBOL
            }
        })

        res = _.groupBy(res, 'SYMBOL')
        _.keys(res).forEach(function (symbol) {
            var rows = res[symbol]
                , nearest = rows[rows.length - 1]
                , lineFactor = nearest.TCLOSE / nearest.AADJUSTINGFACTOR

            rows.forEach(function (r) {
                if (r.TRADEDATE > endDate) {
                    return
                }
                var close = r.AADJUSTINGFACTOR * lineFactor
                    , factor = close / r.TCLOSE
                    , factorMul100 = close / r.TCLOSE * 100
                ret.push({
                    symbol: symbol,
                    date: moment(r.TRADEDATE, 'YYYYMMDD').set({hours: 8}).toDate(),
                    lastClose: Math.round(r.LCLOSE * factorMul100) / 100,
                    open: Math.round(r.TOPEN * factorMul100) / 100,
                    close: Math.round(r.TCLOSE * factorMul100) / 100,
                    high: Math.round(r.THIGH * factorMul100) / 100,
                    low: Math.round(r.TLOW * factorMul100) / 100,
                    factor: Math.round(factor * 10000) / 10000
                })
            })
        })
        return ret
    })
}

function historicalAdjustDataHK(stocks, startDate, endDate) {
    if (!stocks) {
        return Promise.resolve([])
    }
    var prm

    if (_.isArray(stocks)) {
        if (!stocks.length) {
            return Promise.resolve([])
        }
        prm = knex
            .select('SYMBOL', 'TRADEDATE', 'TCLOSE', 'AFPUADJLCLOSE', 'AFPUADJOPRC', 'AFPUADJHPRC', 'AFPUADJLPRC', 'AFPUADJCPRC', 'VOL')
            .from(ADJUST_TABLE.hk)
            .whereIn('SYMBOL', stocks.map(function (stock) {
                return stock.symbol
            }))
            .where('TRADEDATE', '>=', startDate.format('YYYYMMDD'))
            .where('TCLOSE', '>', 0)
            .orderBy('TRADEDATE', 'asc')
    } else {
        prm = knex
            .select('SYMBOL', 'TRADEDATE', 'TCLOSE', 'AFPUADJLCLOSE', 'AFPUADJOPRC', 'AFPUADJHPRC', 'AFPUADJLPRC', 'AFPUADJCPRC', 'VOL')
            .from(ADJUST_TABLE.hk)
            .where('SYMBOL', stocks.symbol)
            .where('TRADEDATE', '>=', startDate.format('YYYYMMDD'))
            .where('TCLOSE', '>', 0)
            .orderBy('TRADEDATE', 'asc')
    }

    return prm.then(function (res) {
        var ret = []
        endDate = endDate.format('YYYYMMDD')

        res = _.groupBy(res, 'SYMBOL')
        _.keys(res).forEach(function (symbol) {
            var rows = res[symbol]
                , nearest = rows[rows.length - 1]
                , scaleMul100 = nearest.TCLOSE / nearest.AFPUADJCPRC * 100

            rows.forEach(function (r) {
                if (r.TRADEDATE > endDate) {
                    return
                }
                var factor = r.AFPUADJCPRC * nearest.TCLOSE / nearest.AFPUADJCPRC / r.TCLOSE
                ret.push({
                    symbol: symbol,
                    date: moment(r.TRADEDATE, 'YYYYMMDD').set({hours: 8}).toDate(),
                    lastClose: Math.round(r.AFPUADJLCLOSE * scaleMul100) / 100,
                    open: Math.round(r.AFPUADJOPRC * scaleMul100) / 100,
                    close: Math.round(r.AFPUADJCPRC * scaleMul100) / 100,
                    high: Math.round(r.AFPUADJHPRC * scaleMul100) / 100,
                    low: Math.round(r.AFPUADJLPRC * scaleMul100) / 100,
                    factor: Math.round(factor * 10000) / 10000,
                    volume: r.VOL
                })
            })
        })
        return ret
    })
}

function adjustData(stocks, startDate, endDate) {
    if (!stocks) {
        return Promise.resolve([])
    }

    startDate = moment(startDate)
    endDate = moment(endDate)

    if (_.isArray(stocks)) {
        var countries = separateStocks(stocks)
        countries.cn = countries.cn.concat(countries.index)

        var res
        return historicalAdjustDataCN(countries.cn, startDate, endDate)
            .then(function (cnRes) {
                res = cnRes
                return historicalAdjustDataHK(countries.hk, startDate, endDate)
            }).then(function (hkRes) {
                return res.concat(hkRes)
            })
    } else {
        if (isCNStock(stocks)) {
            return historicalAdjustDataCN(stocks, startDate, endDate)
        } else if (isHKStock(stocks)) {
            return historicalAdjustDataHK(stocks, startDate, endDate)
        } else {
            return Promise.resolve([])
        }
    }
}

function stockInfoCN(stocks) {
    if (!stocks) {
        return Promise.resolve([])
    }

    if (_.isArray(stocks)) {
        if (!stocks.length) {
            return Promise.resolve([])
        }

        var s = _.indexBy(stocks, function (stock) {
            return stock.exchange + stock.symbol
        })

        return knex
            .select('SYMBOL', 'EXCHANGE', 'SESNAME', 'SEENGNAME', 'TOTALSHARE', 'LISTSTATUS', 'LISTDATE', 'LISTOPRICE', 'DELISTDATE', 'DELISTCPRICE')
            .from('tq_sk_basicinfo')
            .whereIn('SYMBOL', stocks.map(function (stock) {
                return stock.symbol
            }))
            .then(function (res) {
                return res.filter(function (r) {
                    return s[EXCHANGE_INVERT[r.EXCHANGE] + r.SYMBOL]
                })
            })
    } else {
        return knex
            .select('SYMBOL', 'EXCHANGE', 'SESNAME', 'SEENGNAME', 'TOTALSHARE', 'LISTSTATUS', 'LISTDATE', 'LISTOPRICE', 'DELISTDATE', 'DELISTCPRICE')
            .from('tq_sk_basicinfo')
            .where(
            stocks.exchange ? {
                'SYMBOL': stocks.symbol,
                'EXCHANGE': EXCHANGE[stocks.exchange]
            } : {
                'SYMBOL': stocks.symbol
            }
        )
    }
}

function stockInfoHK(stocks) {
    if (!stocks) {
        return Promise.resolve([])
    }

    if (_.isArray(stocks)) {
        if (!stocks.length) {
            return Promise.resolve([])
        }

        return knex
            .select('SYMBOL', 'EXCHANGE', 'SESNAME', 'SEENGNAME', 'LISTSTATUS', 'LISTDATE', 'LISTOPRICE', 'DELISTDATE', 'DELISTCPRICE')
            .from('tq_sk_hkbasicinfo')
            .whereIn('SYMBOL', stocks.map(function (stock) {
                return stock.symbol
            }))
    } else {
        return knex
            .select('SYMBOL', 'EXCHANGE', 'SESNAME', 'SEENGNAME', 'LISTSTATUS', 'LISTDATE', 'LISTOPRICE', 'DELISTDATE', 'DELISTCPRICE')
            .from('tq_sk_hkbasicinfo')
            .where({'SYMBOL': stocks.symbol})
    }
}

function stockInfoUS(stocks) {
    if (!stocks) {
        return Promise.resolve([])
    }

    if (_.isArray(stocks)) {
        if (!stocks.length) {
            return Promise.resolve([])
        }

        return knex
            .select('SYMBOL', 'EXCHANGE', 'SESNAME', 'SEENGNAME', 'TOTALSHARE', 'LISTSTATUS', 'LISTDATE', 'LISTOPRICE', 'DELISTDATE', 'DELISTCPRICE')
            .from('tq_sk_usbasicinfo')
            .whereIn('SYMBOL', stocks.map(function (stock) {
                return stock.symbol
            }))
    } else {
        return knex
            .select('SYMBOL', 'EXCHANGE', 'SESNAME', 'SEENGNAME', 'TOTALSHARE', 'LISTSTATUS', 'LISTDATE', 'LISTOPRICE', 'DELISTDATE', 'DELISTCPRICE')
            .from('tq_sk_usbasicinfo')
            .where({'SYMBOL': stocks.symbol})
    }
}

function stockInfo(stocks) {
    var ret
    if (_.isArray(stocks)) {
        var countries = separateStocks(stocks)
        countries.cn = countries.cn.concat(countries.index)

        var res
        ret = stockInfoCN(countries.cn)
            .then(function (cnRes) {
                res = cnRes
                return stockInfoHK(countries.hk)
            }).then(function (hkRes) {
                res = res.concat(hkRes)
                return stockInfoUS(countries.us)
            }).then(function (usRes) {
                return res.concat(usRes)
            })
    } else {
        if (isCNStock(stocks)) {
            ret = stockInfoCN(stocks)
        } else if (isHKStock(stocks)) {
            ret = stockInfoHK(stocks)
        } else if (isUSStock(stocks)) {
            ret = stockInfoUS(stocks)
        } else {
            ret = Promise.resolve([])
        }
        ret.then(function (res) {
            if (res.length === 1) {
                return res[0]
            }
        })
    }

    return ret.then(afterQuery)
}

queryHistoricalData('cn', {
    symbol: '831395',
    name: '智通建设',
    exchange: 'NEEQ',
    country: 'CN'
}, moment('2015-08-01'), moment()).then(function (res) {
    console.log(res)
})
