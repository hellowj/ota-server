通过OTA的方式安装apk和ipa。
基于[ios-ipa-server](https://github.com/bumaociyuan/ios-ipa-server)开发


# 支持
* OS X
* Ubuntu
* CentOS
* 其他平台未测试

# 需要
* [nodejs](https://nodejs.org/)


# 用法
```
Usage: ios-ipa-server [option] [dir]

Options:

-h, --help                output usage information
-V, --version             output the version number
-p, --port <port-number>  set port for server (defaults is 1234)
```


# 效果图
![screeshot](screeshot.jpg)


```
# 下载源码
$ git clone git@github.com:hellowj/ota_server.git

# 安装依赖包
$ cd ota-server
$ npm install 

# 添加测试数据
# 把apk文件放在apk目录下，把ipa文件放在ipa目录下

# 运行
$ node bin/ota-server
# open https://ip:port on your iphone
```

# Lisence
[MIT](https://github.com/bumaociyuan/zxIpaServer/blob/master/LICENSE.md)
