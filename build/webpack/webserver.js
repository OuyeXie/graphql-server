import path from 'path'

export default {
  entry: path.resolve(__dirname, '../../src/webserver', 'app.js'),
  module: {
    //loaders: [
    //  {
    //    test: /\.js$/,
    //    loader: 'babel',
    //    query: {stage: 0, plugins: ['../babelRelayPlugin']}
    //  }
    //]
  },
  output: {filename: 'app.js', path: '/'}
}
