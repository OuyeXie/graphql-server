import path from 'path'

export default {
    entry: path.resolve(__dirname, '../../src/graphql/server', 'index.js'),
    module: {
        //loaders: [
        //  {
        //    test: /\.js$/,
        //    loader: 'babel',
        //    query: {stage: 0, plugins: ['../babelRelayPlugin']}
        //  }
        //]
        loaders: [
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /\.js$|.jsx$/,
                exclude: /node_modules/,
                loader: 'babel'
            }
        ]
    },
    output: {filename: 'index.js', path: 'dist'},
    resolve: {
        extensions: ['', '.js', '.json', '.jsx'],
        modulesDirectories: ['node_modules', 'src/graphql/server']
    }
}
