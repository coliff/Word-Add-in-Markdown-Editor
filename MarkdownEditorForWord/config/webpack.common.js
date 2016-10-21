var webpack = require('webpack');
var helpers = require('./helpers');

var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var autoprefixer = require('autoprefixer');
var perfectionist = require('perfectionist');

module.exports = {
    entry: {
        'polyfills': './src/polyfills.ts',
        'vendor': './src/vendor.ts',
        'app': './src/app.ts'
    },

    resolve: {
        extensions: ['', '.js', '.ts']
    },

    module: {
        loaders: [
            {
                test: /\.html$/,
                loader: 'html'
            },
            {
                test: /\.ts$/,
                loaders: ['ts', 'angular2-template-loader']
            },
            {
                test: /^(?!.*component).*\.scss$/,
                loader: ExtractTextPlugin.extract('css!postcss!sass')
            },
            {
                test: /\.component\.scss$/,
                loaders: ['raw', 'resolve-url', 'postcss', 'sass']
            },
            {
                test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)$/,
                loader: 'file?name=assets/[name].[ext]'
            }
        ],
        preLoaders: [
            {
                test: /\.js$/,
                loader: "source-map-loader",
                exclude: [
                    helpers.node_modules('node_modules/rxjs'),
                    helpers.node_modules('node_modules/@angular')
                ]
            }
        ]
    },

    postcss: function () {
        return [autoprefixer({ browsers: ['Safari >= 8', 'last 2 versions'] }), perfectionist];
    },

    externals: {
        'underscore': '_',
        'jquery': '$',
        'to-markdown': 'toMarkdown'
    },

    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: ['polyfills', 'vendor', 'app'].reverse()
        }),

        new HtmlWebpackPlugin({
            template: 'src/index.html'
        }),

        new CopyWebpackPlugin([
            {
                from: './src/assets',
                to: 'assets',
            }
        ])
    ]
};