# 自定义 Spring Boot Starter

Spring Boot Starter 是一种方便的依赖描述符，可以简化 Maven/Gradle 配置。通过自定义 Starter，我们可以将常用的功能模块封装成可复用的组件，实现"开箱即用"的效果。

---

## 目录

- [什么是 Starter](#什么是-starter)
- [Starter 命名规范](#starter-命名规范)
- [创建自定义 Starter](#创建自定义-starter)
- [自动配置原理](#自动配置原理)
- [完整示例：日志追踪 Starter](#完整示例日志追踪-starter)
- [高级特性](#高级特性)
- [发布与使用](#发布与使用)
- [最佳实践](#最佳实践)

---

## 什么是 Starter

### Starter 的作用

Spring Boot Starter 是预定义的依赖描述符，它的主要作用：

- **简化依赖管理**：一个 Starter 包含相关功能的全部依赖
- **自动配置**：根据 classpath 自动配置 Spring 应用
- **约定优于配置**：提供合理的默认配置，减少样板代码

### 官方 Starter 示例

| Starter | 功能说明 |
|---------|----------|
| `spring-boot-starter-web` | Web 应用开发（含 Tomcat、Spring MVC） |
| `spring-boot-starter-data-jpa` | JPA 数据访问 |
| `spring-boot-starter-redis` | Redis 缓存支持 |
| `spring-boot-starter-security` | 安全认证 |

---

## Starter 命名规范

### 官方 Starter 命名

- 前缀：`spring-boot-starter-`
- 示例：`spring-boot-starter-web`

### 自定义 Starter 命名

- 前缀：`{模块名}-spring-boot-starter`
- 示例：`mybatis-spring-boot-starter`

### 自动配置模块命名

- 后缀：`-spring-boot-autoconfigure`
- 示例：`mybatis-spring-boot-autoconfigure`

---

## 创建自定义 Starter

### 项目结构

一个标准的自定义 Starter 包含两个模块：

```
my-starter-parent/
├── my-spring-boot-autoconfigure/    # 自动配置模块
│   ├── src/main/java/
│   │   └── com/example/autoconfigure/
│   │       ├── MyAutoConfiguration.java      # 自动配置类
│   │       ├── MyProperties.java             # 配置属性类
│   │       └── MyService.java                # 核心服务类
│   ├── src/main/resources/
│   │   └── META-INF/
│   │       └── spring/
│   │           └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
│   └── pom.xml
├── my-spring-boot-starter/          # Starter 模块（依赖聚合）
│   └── pom.xml
└── pom.xml                          # 父 POM
```

### 1. 创建父 POM

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.example</groupId>
    <artifactId>my-starter-parent</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>
    
    <name>My Starter Parent</name>
    <description>自定义 Starter 父项目</description>
    
    <modules>
        <module>my-spring-boot-autoconfigure</module>
        <module>my-spring-boot-starter</module>
    </modules>
    
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring-boot.version>3.2.0</spring-boot.version>
    </properties>
    
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

### 2. 创建 Autoconfigure 模块

**pom.xml：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>com.example</groupId>
        <artifactId>my-starter-parent</artifactId>
        <version>1.0.0</version>
    </parent>
    
    <artifactId>my-spring-boot-autoconfigure</artifactId>
    <name>My Spring Boot Autoconfigure</name>
    
    <dependencies>
        <!-- 自动配置依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-autoconfigure</artifactId>
        </dependency>
        
        <!-- 配置处理器（生成配置元数据） -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-configuration-processor</artifactId>
            <optional>true</optional>
        </dependency>
        
        <!-- Lombok（可选） -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
</project>
```

### 3. 配置属性类

```java
package com.example.autoconfigure;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 配置属性类
 * 前缀为：my.service
 */
@Data
@ConfigurationProperties(prefix = "my.service")
public class MyProperties {
    
    /**
     * 是否启用
     */
    private boolean enabled = true;
    
    /**
     * 服务名称
     */
    private String name = "default";
    
    /**
     * 超时时间（毫秒）
     */
    private int timeout = 5000;
    
    /**
     * 重试次数
     */
    private int retryTimes = 3;
    
    /**
     * 目标地址列表
     */
    private List<String> endpoints = new ArrayList<>();
}
```

### 4. 核心服务类

```java
package com.example.autoconfigure;

import lombok.extern.slf4j.Slf4j;

/**
 * 核心服务类
 */
@Slf4j
public class MyService {
    
    private final MyProperties properties;
    
    public MyService(MyProperties properties) {
        this.properties = properties;
    }
    
    /**
     * 执行业务操作
     */
    public String execute(String param) {
        log.info("[{}] 执行操作，参数: {}, 超时: {}ms", 
                properties.getName(), param, properties.getTimeout());
        
        // 模拟业务逻辑
        return String.format("Service[%s] processed: %s", 
                properties.getName(), param);
    }
    
    /**
     * 检查配置是否有效
     */
    public boolean isValid() {
        return properties.isEnabled() 
                && !properties.getEndpoints().isEmpty();
    }
}
```

### 5. 自动配置类

```java
package com.example.autoconfigure;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/**
 * 自动配置类
 */
@Slf4j
@AutoConfiguration
@ConditionalOnClass(MyService.class)
@EnableConfigurationProperties(MyProperties.class)
@ConditionalOnProperty(
    prefix = "my.service", 
    name = "enabled", 
    havingValue = "true", 
    matchIfMissing = true
)
public class MyAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public MyService myService(MyProperties properties) {
        log.info("初始化 MyService，配置: {}", properties);
        return new MyService(properties);
    }
}
```

### 6. 注册自动配置

**Spring Boot 3.x 方式**（推荐）：

创建文件 `src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`

```
com.example.autoconfigure.MyAutoConfiguration
```

**Spring Boot 2.x 方式**（兼容）：

创建文件 `src/main/resources/META-INF/spring.factories`

```properties
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.autoconfigure.MyAutoConfiguration
```

### 7. 创建 Starter 模块

**pom.xml：**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>com.example</groupId>
        <artifactId>my-starter-parent</artifactId>
        <version>1.0.0</version>
    </parent>
    
    <artifactId>my-spring-boot-starter</artifactId>
    <name>My Spring Boot Starter</name>
    
    <dependencies>
        <!-- 引入自动配置模块 -->
        <dependency>
            <groupId>com.example</groupId>
            <artifactId>my-spring-boot-autoconfigure</artifactId>
            <version>${project.version}</version>
        </dependency>
        
        <!-- 可以添加其他依赖 -->
    </dependencies>
</project>
```

---

## 自动配置原理

### 条件注解

| 注解 | 作用 |
|------|------|
| `@ConditionalOnClass` | 类存在时生效 |
| `@ConditionalOnMissingClass` | 类不存在时生效 |
| `@ConditionalOnBean` | Bean 存在时生效 |
| `@ConditionalOnMissingBean` | Bean 不存在时生效 |
| `@ConditionalOnProperty` | 配置属性满足条件时生效 |
| `@ConditionalOnWebApplication` | Web 应用时生效 |
| `@ConditionalOnExpression` | SpEL 表达式为 true 时生效 |

### 配置加载顺序

```
1. spring-boot-autoconfigure 包中的 META-INF/spring-autoconfigure-metadata.properties
2. 用户自定义的 META-INF/spring/*.imports 文件
3. @AutoConfigureBefore / @AutoConfigureAfter 控制顺序
4. @AutoConfigureOrder 指定顺序
```

### 配置元数据

创建 `src/main/resources/META-INF/additional-spring-configuration-metadata.json`：

```json
{
  "properties": [
    {
      "name": "my.service.enabled",
      "type": "java.lang.Boolean",
      "description": "是否启用 MyService",
      "defaultValue": true
    },
    {
      "name": "my.service.name",
      "type": "java.lang.String",
      "description": "服务名称",
      "defaultValue": "default"
    },
    {
      "name": "my.service.timeout",
      "type": "java.lang.Integer",
      "description": "超时时间（毫秒）",
      "defaultValue": 5000
    }
  ],
  "hints": [
    {
      "name": "my.service.name",
      "values": [
        {"value": "default", "description": "默认服务"},
        {"value": "premium", "description": "高级服务"}
      ]
    }
  ]
}
```

---

## 完整示例：日志追踪 Starter

### 需求分析

实现一个分布式日志追踪 Starter，功能包括：
- 自动生成 Trace ID
- 通过 MDC 传递上下文
- 支持 Feign 拦截器传递
- 支持 RestTemplate 拦截器传递

### 项目结构

```
trace-spring-boot-starter/
├── trace-spring-boot-autoconfigure/
│   ├── src/main/java/com/example/trace/
│   │   ├── TraceAutoConfiguration.java
│   │   ├── TraceProperties.java
│   │   ├── TraceContext.java
│   │   ├── TraceFilter.java
│   │   ├── FeignTraceInterceptor.java
│   │   └── RestTemplateTraceInterceptor.java
│   └── pom.xml
├── trace-spring-boot-starter/
│   └── pom.xml
└── pom.xml
```

### 配置属性

```java
@Data
@ConfigurationProperties(prefix = "trace")
public class TraceProperties {
    
    private boolean enabled = true;
    
    /** Trace ID 请求头名称 */
    private String headerName = "X-Trace-Id";
    
    /** MDC 中的 key */
    private String mdcKey = "traceId";
    
    /** 是否打印日志 */
    private boolean logEnabled = true;
    
    /** 需要跳过的 URL 模式 */
    private List<String> skipPatterns = Arrays.asList("/health", "/actuator/**");
}
```

### Trace 上下文

```java
@Slf4j
public class TraceContext {
    
    private static final String TRACE_ID_KEY = "traceId";
    
    /**
     * 生成 Trace ID
     */
    public static String generateTraceId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }
    
    /**
     * 获取当前 Trace ID
     */
    public static String getTraceId() {
        return MDC.get(TRACE_ID_KEY);
    }
    
    /**
     * 设置 Trace ID
     */
    public static void setTraceId(String traceId) {
        MDC.put(TRACE_ID_KEY, traceId);
    }
    
    /**
     * 清除 Trace ID
     */
    public static void clear() {
        MDC.remove(TRACE_ID_KEY);
    }
}
```

### Web 过滤器

```java
@Component
@ConditionalOnWebApplication
public class TraceFilter extends OncePerRequestFilter {
    
    @Autowired
    private TraceProperties properties;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) 
                                    throws ServletException, IOException {
        try {
            // 从请求头获取或生成 Trace ID
            String traceId = request.getHeader(properties.getHeaderName());
            if (StrUtil.isBlank(traceId)) {
                traceId = TraceContext.generateTraceId();
            }
            
            // 放入 MDC
            TraceContext.setTraceId(traceId);
            
            // 设置响应头
            response.setHeader(properties.getHeaderName(), traceId);
            
            if (properties.isLogEnabled()) {
                log.info("[Trace:{}] {} {}", traceId, 
                        request.getMethod(), request.getRequestURI());
            }
            
            filterChain.doFilter(request, response);
        } finally {
            TraceContext.clear();
        }
    }
    
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return properties.getSkipPatterns().stream()
                .anyMatch(pattern -> antPathMatch(pattern, uri));
    }
}
```

### Feign 拦截器

```java
@ConditionalOnClass(Feign.class)
public class FeignTraceInterceptor implements RequestInterceptor {
    
    @Autowired
    private TraceProperties properties;
    
    @Override
    public void apply(RequestTemplate template) {
        String traceId = TraceContext.getTraceId();
        if (StrUtil.isNotBlank(traceId)) {
            template.header(properties.getHeaderName(), traceId);
        }
    }
}
```

### 自动配置类

```java
@Slf4j
@AutoConfiguration
@EnableConfigurationProperties(TraceProperties.class)
@ConditionalOnProperty(prefix = "trace", name = "enabled", matchIfMissing = true)
public class TraceAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public TraceFilter traceFilter() {
        return new TraceFilter();
    }
    
    @Bean
    @ConditionalOnClass(Feign.class)
    @ConditionalOnMissingBean
    public FeignTraceInterceptor feignTraceInterceptor() {
        return new FeignTraceInterceptor();
    }
    
    @Bean
    @ConditionalOnMissingBean
    public RestTemplateTraceInterceptor restTemplateTraceInterceptor() {
        return new RestTemplateTraceInterceptor();
    }
}
```

---

## 高级特性

### 1. 多条件组合

```java
@AutoConfiguration
@ConditionalOnClass({DataSource.class, SqlSessionFactory.class})
@ConditionalOnBean(DataSource.class)
@ConditionalOnProperty(prefix = "mybatis", name = "enabled", matchIfMissing = true)
public class MyBatisAutoConfiguration {
    // ...
}
```

### 2. 配置加载顺序

```java
@AutoConfiguration
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
@AutoConfigureBefore(MyBatisAutoConfiguration.class)
public class MyCustomAutoConfiguration {
    // ...
}
```

### 3. 配置提示（IDE 支持）

```json
{
  "groups": [
    {
      "name": "my.service",
      "type": "com.example.autoconfigure.MyProperties",
      "sourceType": "com.example.autoconfigure.MyProperties"
    }
  ],
  "properties": [
    {
      "name": "my.service.enabled",
      "type": "java.lang.Boolean",
      "description": "是否启用服务",
      "sourceType": "com.example.autoconfigure.MyProperties",
      "defaultValue": true
    }
  ]
}
```

### 4. 健康检查

```java
@Component
public class MyServiceHealthIndicator implements HealthIndicator {
    
    @Autowired
    private MyService myService;
    
    @Override
    public Health health() {
        if (myService.isValid()) {
            return Health.up()
                    .withDetail("service", myService.getName())
                    .withDetail("status", "running")
                    .build();
        }
        return Health.down()
                .withDetail("error", "Service configuration invalid")
                .build();
    }
}
```

---

## 发布与使用

### 发布到 Maven 仓库

```bash
# 打包
mvn clean package

# 安装到本地仓库
mvn clean install

# 部署到远程仓库
mvn clean deploy
```

### 在项目中使用

**添加依赖：**

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>my-spring-boot-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

**配置文件：**

```yaml
my:
  service:
    enabled: true
    name: my-application
    timeout: 10000
    retry-times: 5
    endpoints:
      - http://server1:8080
      - http://server2:8080
```

**代码注入使用：**

```java
@Service
public class BusinessService {
    
    @Autowired
    private MyService myService;
    
    public void doSomething() {
        String result = myService.execute("test");
        System.out.println(result);
    }
}
```

---

## 最佳实践

### 1. 设计原则

- **单一职责**：每个 Starter 只做一件事
- **合理默认**：提供开箱即用的默认配置
- **可配置性**：关键参数应可通过配置调整
- **条件加载**：使用条件注解避免不必要的 Bean 创建

### 2. 版本管理

```xml
<!-- 跟随 Spring Boot 版本 -->
<properties>
    <spring-boot.version>3.2.0</spring-boot.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>${spring-boot.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 3. 测试策略

```java
@SpringBootTest(classes = MyAutoConfiguration.class)
@TestPropertySource(properties = "my.service.enabled=true")
class MyAutoConfigurationTest {
    
    @Autowired
    private MyService myService;
    
    @Test
    void testServiceLoaded() {
        assertNotNull(myService);
        assertEquals("default", myService.getProperties().getName());
    }
}
```

### 4. 文档规范

- 提供详细的 README.md
- 列出所有配置项及默认值
- 提供使用示例代码
- 说明版本兼容性

---

## 参考资源

- [Spring Boot 官方文档 - Creating Your Own Auto-configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.developing-auto-configuration)
- [Spring Boot Starter 源码](https://github.com/spring-projects/spring-boot/tree/main/spring-boot-project/spring-boot-starters)
- [自定义 Starter 示例项目](https://github.com/spring-projects/spring-boot/tree/main/spring-boot-samples)
