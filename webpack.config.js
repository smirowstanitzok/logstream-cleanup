const path = require('path')
const slsw = require('serverless-webpack')
const webpack = require('webpack')

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  externals: [{'aws-sdk': 'commonjs aws-sdk'}],
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js'
  },
  node: {
    __dirname: false
  },
  plugins: [
    new webpack.ContextReplacementPlugin(
      /[\/\\]node_modules[\/\\]timezonecomplete[\/\\]/,
      path.resolve('node_modules/tzdata/'),
      {
        'tzdata-backward-utc': 'tzdata-backward-utc',
        'tzdata-etcetera': 'tzdata-etcetera',
        'tzdata-europe': 'tzdata-europe'
      }
    )
  ]
}
