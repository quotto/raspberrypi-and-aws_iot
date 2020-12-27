const path = require('path');
const webpack = require('webpack');
const defines = require('./webpack.define.json');
module.exports = env => {
    return {
        entry: `./${env.entry}/index.js`,
        output: {
            path: path.resolve(__dirname,`${env.entry}/dist`),
            filename: `bundle.js`
        },
        plugins: [
            new webpack.DefinePlugin({
                BACKEND_URL: JSON.stringify(defines.backend_url)
            })
        ]
    }
}