const path = require('path');
const {VueLoaderPlugin} = require("vue-loader");

module.exports = {
    mode: 'none',
    entry: {
        'suspended-ball-chat': './components/suspended-ball-chat/index.ts',
        'chat-panel': './components/chat-panel/index.ts'
    },
    output: {
        path: path.resolve(__dirname, 'lib'),
        publicPath: '/lib/',
        filename: 'components/[name]/index.js',  // 输出文件名
        library: '[name]', // 组件库名称
        libraryTarget: 'umd',  //模块化格式
        umdNamedDefine: true,
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    externals: {
        //将vue依赖 "外部化"，不打包进组件库
        vue: {
            root: 'Vue',
            commonjs: 'vue',
            commonjs2: 'vue',
            amd: 'vue'
        },
        // 状态管理
        vuex: {
            root: 'Vuex',
            commonjs: 'vuex',
            commonjs2: 'vuex',
            amd: 'vuex'
        },
        'vue-class-component': {
            root: 'VueClassComponent',
            commonjs: 'vue-class-component',
            commonjs2: 'vue-class-component',
            amd: 'vue-class-component'
        },
        'vue-property-decorator': {
            root: 'VuePropertyDecorator',
            commonjs: 'vue-property-decorator',
            commonjs2: 'vue-property-decorator',
            amd: 'vue-property-decorator'
        },
        lodash: {
            root: '_',
            commonjs: 'lodash',
            commonjs2: 'lodash',
            amd: 'lodash'
        },
        showdown: {
            root: 'showdown',
            commonjs: 'showdown',
            commonjs2: 'showdown',
            amd: 'showdown'
        },
        'element-ui': {
            root: 'ELEMENT',
            commonjs: 'element-ui',
            commonjs2: 'element-ui',
            amd: 'element-ui'
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
                exclude: /node_modules/
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
                    name: 'font/[name].[ext]'
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
    optimization: {
        minimize: true
    },
    plugins: [
        new VueLoaderPlugin()
    ]
};
