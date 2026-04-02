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
# 原配置（约 4GB）
set "JAVA_OPT=%JAVA_OPT% -server -Xms4g -Xmx4g -Xmn2g"

# 修改为适合 Windows 的配置（512MB）
set "JAVA_OPT=%JAVA_OPT% -server -Xms512m -Xmx512m -Xmn256m"
```

#### 4.2 修改 runbroker.cmd

编辑 `bin/runbroker.cmd`，修改 JVM 内存参数：

```batch
# 原配置（约 8GB）
set "JAVA_OPT=%JAVA_OPT% -server -Xms8g -Xmx8g"

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

成功启动后，会看到日志：

```
The Name Server boot success. serializeType=JSON
```

### 6. 启动 Broker

在另一个命令行窗口执行：

```batch
cd %ROCKETMQ_HOME%\bin
start mqbroker.cmd -n 127.0.0.1:9876 autoCreateTopicEnable=true
```

成功启动后，会看到日志：

```
The broker[broker-a, 192.168.x.x:10911] boot success...
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

### 主题管理

```batch
# 创建主题
mqadmin.cmd updateTopic -n 127.0.0.1:9876 -c DefaultCluster -t TestTopic

# 查看主题列表
mqadmin.cmd topicList -n 127.0.0.1:9876

# 查看主题路由信息
mqadmin.cmd topicRoute -n 127.0.0.1:9876 -t TestTopic
```

### 消费者组管理

```batch
# 查看消费者组列表
mqadmin.cmd consumerProgress -n 127.0.0.1:9876

# 查看指定消费者组
mqadmin.cmd consumerStatus -n 127.0.0.1:9876 -g consumerGroupName
```

## 配置文件说明

### Broker 配置文件

创建 `conf/broker.conf`：

```properties
# Broker 名称
brokerName=broker-a

# 集群名称
brokerClusterName=DefaultCluster

# Broker ID，0 表示 Master
brokerId=0

# NameServer 地址
namesrvAddr=127.0.0.1:9876

# 自动创建主题
autoCreateTopicEnable=true

# 存储路径
storePathRootDir=D:\\rocketmq\\store
storePathCommitLog=D:\\rocketmq\\store\\commitlog

# 监听端口
listenPort=10911
```

使用配置文件启动 Broker：

```batch
start mqbroker.cmd -c ../conf/broker.conf
```

## 常见问题

### 1. 内存不足错误

**问题**：`Error: Could not create the Java Virtual Machine`

**解决**：按照步骤 4 修改启动脚本的内存参数。

### 2. 端口被占用

**问题**：`Address already in use: bind`

**解决**：

```batch
# 查找占用 9876 端口的进程
netstat -ano | findstr 9876

# 结束进程
taskkill /PID <进程ID> /F
```

### 3. 长路径问题

**问题**：Windows 对路径长度有限制

**解决**：将 RocketMQ 解压到短路径，如 `D:\rocketmq`。

### 4. 中文乱码

**问题**：控制台输出中文乱码

**解决**：修改 `bin/runserver.cmd` 和 `bin/runbroker.cmd`，添加：

```batch
set "JAVA_OPT=%JAVA_OPT% -Dfile.encoding=UTF-8"
```

## 控制台安装（可选）

RocketMQ 官方提供了一个 Web 管理界面。

### 下载控制台

```bash
# 克隆源码
git clone https://github.com/apache/rocketmq-dashboard.git

# 或者下载已编译版本
https://github.com/apache/rocketmq-dashboard/releases
```

### 启动控制台

```batch
# 修改配置文件 application.properties
rocketmq.config.namesrvAddr=127.0.0.1:9876

# 启动
java -jar rocketmq-dashboard-1.0.0.jar
```

访问 `http://localhost:8080` 查看管理界面。

## 开机自启动配置

### 使用 NSSM 创建 Windows 服务

1. 下载 NSSM：https://nssm.cc/download
2. 创建 NameServer 服务：

```batch
nssm install RocketMQ-NameServer
# Path: D:\rocketmq\rocketmq-5.1.4\bin\mqnamesrv.cmd
# Startup directory: D:\rocketmq\rocketmq-5.1.4\bin
```

3. 创建 Broker 服务：

```batch
nssm install RocketMQ-Broker
# Path: D:\rocketmq\rocketmq-5.1.4\bin\mqbroker.cmd
# Arguments: -n 127.0.0.1:9876 autoCreateTopicEnable=true
# Startup directory: D:\rocketmq\rocketmq-5.1.4\bin
```

## 相关链接

- [RocketMQ 官方文档](https://rocketmq.apache.org/docs/)
- [RocketMQ GitHub](https://github.com/apache/rocketmq)
- [RocketMQ Dashboard](https://github.com/apache/rocketmq-dashboard)
