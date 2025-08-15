const path = require('path');
const {VueLoaderPlugin} = require("vue-loader");

const basePath = path.resolve(__dirname)

module.exports = {
    mode: 'none',
    entry: path.join(basePath, 'components', 'index.ts'),
    output: {
        path: path.resolve(__dirname, 'lib'),
        publicPath: '/lib/',
        filename: 'index.js',  // 输出文件名
        library: 'suspended-ball-chat', // 组件库名称
        libraryTarget: 'umd',  //模块化格式
        umdNamedDefine: true
    },
    externals: {
        vue: {  //将vue依赖 "外部化"，不打包进组件库
            root: 'Vue',
            commonjs: 'vue',
            commonjs2: 'vue',
            amd: 'vue'
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                options: {
                    appendTsSuffixTo: [/\.vue$/],
                    configFile: path.resolve(__dirname, 'tsconfig.json')
                },
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.css$/,
                use: [
                    'vue-style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    'vue-style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                loader: 'file-loader',
                options: {
                    name: 'icons/[name].[ext]',
                    esModule: false,
                }
            },
            {
                test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    name: 'font/[name].[ext]',
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.vue', '.json'],
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    plugins: [
        new VueLoaderPlugin()
    ]
};
