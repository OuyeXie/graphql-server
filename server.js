/* eslint-disable no-var, no-console */
require('babel-core/register')

process.env.HOT_RELOAD = 'react-hot-loader'

var WebpackDevServer = require('webpack-dev-server')
var webpack = require('webpack')
var webpackConfigGraphQL = require('./webpack.config.graphql')
var webpackConfigWebserver = require('./webpack.config.webserver')
var forever = require('forever-monitor')
var path = require('path')
var express = require('express')

function createMoninor(webpackConfig, config) {
    var monitor

    webpack(webpackConfig)
        .watch(100, function (err, stats) {
            if (!monitor) {
                monitor = new forever.Monitor(config.script, {
                    max: 1,
                    env: config.env
                })
                monitor.start()
            } else {
                monitor.restart()
            }
            if (err) {
                console.log(err.toString({
                    colors: true
                }))
            }

            if (stats) {
                console.log(stats.toString({
                    colors: true
                }))
            }
        }
    )
}

function createWebpackDevServer(webpackConfig, config) {
    var server = new WebpackDevServer(webpack(webpackConfig), {
        contentBase: '/public/',
        publicPath: '/src/webserver/',
        stats: {colors: true},
        proxy: {'/graphql': `http://localhost:${config.proxyPort}`}
    })

    // Serve static resources
    server.use('/', express.static('public'));
    server.use('/node_modules', express.static('node_modules'));

    server.listen(config.port, () => {
        console.log(`App is now running on http://localhost:${config.port}`);
    })
}

var webserverPort = process.env.PORT
    ? Number(process.env.PORT)
    : 3000
var graphqlPort = webserverPort + 1

createMoninor(webpackConfigGraphQL, {
    script: path.join(__dirname, 'dist', 'index.js'),
    env: {
        PORT: graphqlPort
    }
})

createWebpackDevServer(webpackConfigWebserver, {
    port: webserverPort,
    proxyPort: graphqlPort
})
