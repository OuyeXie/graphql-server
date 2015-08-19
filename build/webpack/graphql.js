import {DefinePlugin} from 'webpack'

import path from 'path'

import config from '../config'
import base from './base'

export default {
    ...base,
    ...config.nodeMixin,

    entry: path.resolve(__dirname, '../../src/graphql/server', 'index.js'),

    output: {filename: 'index.js', path: 'dist'},

    plugins: [
        new DefinePlugin({
            '__FRONTEND__': false,
            '__BACKEND__': true
        }),

        ...base.plugins
    ]
}
