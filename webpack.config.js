const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const package = require('./package.json');

const publicPath = path.resolve(__dirname, 'public');
const srcPath = path.resolve(__dirname, 'src');
const testPath = path.resolve(__dirname, 'test');
const buildPath = path.resolve(__dirname, 'dist');

const { name, version, license, homepage, author } = package;
const banner = `
  ${name} v${version}
  ${homepage}
  Copyright (c) ${author} and project contributors.
  This source code is licensed under ${license} found in the
  LICENSE file in the root directory of this source tree.
`;

module.exports = {
    entry: {
        main: {
            import: path.join(srcPath, 'index.ts'),
        },
        test: {
            import: path.join(testPath, 'index.ts'),
            dependOn: 'main'
        }
    },
    output: {
        path: buildPath,
        filename: '[name].bundle.js',
        library: 'visual-tree',
        libraryTarget: 'umd',
        clean: true
    },
    optimization: {
        minimize: true,
        minimizer: [
          new TerserPlugin({ extractComments: false })
        ],
      },
    module: {
        rules: [{
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: 'ts-loader'
            }
        ]
    },
    resolve: {
        extensions: ['*', '.js', '.ts']
    },
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        open: true,
        hot: true
    },
    plugins: [
        new CopyWebpackPlugin({
        patterns: [
                {
                from: './public/assets',
                to: 'public/assets',
                globOptions: {
                    ignore: ['*.DS_Store'],
                },
                    noErrorOnMissing: true,
                },
            ],
        }),
        new HtmlWebpackPlugin({
            template: path.join(publicPath, 'index.html'),
            filename: 'index.html'
        }),
        new webpack.BannerPlugin(banner)
    ]
};
