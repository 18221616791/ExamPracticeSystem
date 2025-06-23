const { defineConfig } = require('@vue/cli-service')
const path = require('path')
const webpack = require('webpack')

module.exports = defineConfig({
  // 基础配置
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  outputDir: 'dist',
  assetsDir: 'static',
  indexPath: 'index.html',
  filenameHashing: true,
  
  // 开发服务器配置
  devServer: {
    port: 8080,
    host: '0.0.0.0',
    https: false,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
    
    // 代理配置 - 将API请求代理到后端服务器
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug',
        onError: function(err, req, res) {
          console.log('代理错误:', err)
        },
        onProxyReq: function(proxyReq, req, res) {
          console.log('代理请求:', req.method, req.url)
        }
      }
    },
    
    // 客户端日志级别
    client: {
      logging: 'info',
      overlay: {
        errors: true,
        warnings: false
      }
    }
  },
  
  // 构建配置
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: JSON.stringify(true),
        __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'components': path.resolve(__dirname, 'src/components'),
        'views': path.resolve(__dirname, 'src/views'),
        'utils': path.resolve(__dirname, 'src/utils'),
        'assets': path.resolve(__dirname, 'src/assets')
      }
    },
    
    // 性能优化
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'chunk-vendors',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          vant: {
            name: 'chunk-vant',
            test: /[\\/]node_modules[\\/]vant[\\/]/,
            priority: 20,
            chunks: 'all'
          }
        }
      }
    }
  },
  
  // CSS 配置
  css: {
    extract: process.env.NODE_ENV === 'production',
    sourceMap: process.env.NODE_ENV !== 'production',
    loaderOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 生产环境配置
  productionSourceMap: false,
  
  // PWA 配置
  pwa: {
    name: '题库导入系统',
    themeColor: '#1989fa',
    msTileColor: '#1989fa',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black',
    
    workboxPluginMode: 'InjectManifest',
    workboxOptions: {
      swSrc: 'src/sw.js'
    },
    
    manifestOptions: {
      name: '题库导入系统',
      short_name: '题库系统',
      description: '题库导入与刷题练习系统',
      display: 'standalone',
      start_url: '/',
      background_color: '#ffffff',
      theme_color: '#1989fa',
      icons: [
        {
          src: './img/icons/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: './img/icons/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  },
  
  // 插件配置
  pluginOptions: {
    // 如果使用了其他插件，可以在这里配置
  },
  
  // Webpack 链式配置
  chainWebpack: config => {
    // 移除预加载插件
    config.plugins.delete('preload')
    config.plugins.delete('prefetch')
    
    // 图片压缩
    config.module
      .rule('images')
      .test(/\.(gif|png|jpe?g|svg)(\?.*)?$/)
      .use('image-webpack-loader')
      .loader('image-webpack-loader')
      .options({
        disable: process.env.NODE_ENV !== 'production'
      })
    
    // 生产环境优化
    if (process.env.NODE_ENV === 'production') {
      // 移除 console
      config.optimization.minimizer('terser').tap(args => {
        args[0].terserOptions.compress.drop_console = true
        args[0].terserOptions.compress.drop_debugger = true
        return args
      })
    }
  },
  
  // 并行处理
  parallel: require('os').cpus().length > 1,
  
  // 第三方插件选项
  pluginOptions: {
    // 如果需要配置其他插件
  }
})