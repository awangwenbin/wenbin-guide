# RocketMQ Windows 安装指南
## 安装步骤
### 1. 下载 RocketMQ
从官方仓库下载最新版本：
```bash
# 下载地址
https://rocketmq.apache.org/zh/download/
# 选择 Binary 版本下载，例如：
rocketmq-all-5.1.4-bin-release.zip
```
### 2. 解压安装包
将下载的压缩包解压到指定目录，例如：
```
D:\rocketmq\rocketmq-5.1.4
```
### 3. 配置环境变量
#### 3.1 配置 ROCKETMQ_HOME
```
变量名：ROCKETMQ_HOME
变量值：D:\rocketmq\rocketmq-5.1.4
```
#### 3.2 添加到 Path
```
%ROCKETMQ_HOME%\bin
```
#### 3.3 JAVA_HOME 尽量使用jdk1.8
### 4. 修改启动脚本（关键步骤）
由于 Windows 脚本默认内存配置较高，需要修改启动参数。
#### 4.1 修改 runserver.cmd
编辑 `bin/runserver.cmd`，修改 JVM 内存参数：
```batch
# 修改为适合 Windows 的配置（512MB）
set "JAVA_OPT=%JAVA_OPT% -server -Xms512m -Xmx512m -Xmn256m"
```
#### 4.2 修改 runbroker.cmd
编辑 `bin/runbroker.cmd`，修改 JVM 内存参数：
```batch
# 修改为适合 Windows 的配置（1GB）
set "JAVA_OPT=%JAVA_OPT% -server -Xms1g -Xmx1g"
```
#### 4.3 修改 tools.cmd
编辑 `bin/tools.cmd`，同样修改内存参数：
```batch
set "JAVA_OPT=%JAVA_OPT% -server -Xms512m -Xmx512m"
```
### 5. 启动 NameServer
打开命令行窗口，执行：
```batch
cd %ROCKETMQ_HOME%\bin
start mqnamesrv.cmd
```
### 6. 启动 Broker
在另一个命令行窗口执行：
```batch
cd %ROCKETMQ_HOME%\bin
start mqbroker.cmd -n 127.0.0.1:9876 autoCreateTopicEnable=true
```
### 7. 验证安装
#### 7.1 使用命令行工具测试
```batch
# 设置环境变量
set NAMESRV_ADDR=127.0.0.1:9876
# 发送测试消息
tools.cmd org.apache.rocketmq.example.quickstart.Producer
# 消费测试消息
tools.cmd org.apache.rocketmq.example.quickstart.Consumer
```
#### 7.2 查看进程
```batch
# 查看 NameServer 和 Broker 进程
jps -l
```
应该看到：
```
NamesrvStartup
BrokerStartup
```
## 常用命令
### 服务管理
```batch
# 启动 NameServer
start mqnamesrv.cmd
# 启动 Broker
start mqbroker.cmd -n 127.0.0.1:9876 autoCreateTopicEnable=true
# 关闭 NameServer
mqshutdown namesrv
# 关闭 Broker
mqshutdown broker
```
## 相关链接
- [RocketMQ 官方文档](https://rocketmq.apache.org/docs/)
- [RocketMQ GitHub](https://github.com/apache/rocketmq)
- [RocketMQ Dashboard](https://github.com/apache/rocketmq-dashboard)