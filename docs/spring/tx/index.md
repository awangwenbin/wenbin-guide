# Spring 事务管理

Spring 提供了声明式事务管理，通过 `@Transactional` 注解即可实现事务控制。

---

## 开启事务支持

在启动类或配置类上添加 `@EnableTransactionManagement`：

```java
@SpringBootApplication
@EnableTransactionManagement
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

> Spring Boot 默认自动开启，通常无需手动添加。

---

## 基本使用

在方法或类上添加 `@Transactional` 注解：

```java
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Transactional
    public void transfer(Long fromId, Long toId, BigDecimal amount) {
        // 扣款
        userMapper.decreaseBalance(fromId, amount);
        // 收款
        userMapper.increaseBalance(toId, amount);
    }
}
```

---

## 事务传播行为（Propagation）

传播行为定义了事务方法被调用时如何处理事务边界。

| 传播行为 | 说明 |
|----------|------|
| `REQUIRED` | 默认。当前无事务则新建，有则加入 |
| `REQUIRES_NEW` | 挂起当前事务，新建独立事务 |
| `SUPPORTS` | 有事务则加入，无则以非事务执行 |
| `NOT_SUPPORTED` | 挂起当前事务，以非事务执行 |
| `MANDATORY` | 必须有事务，否则抛异常 |
| `NEVER` | 必须无事务，否则抛异常 |
| `NESTED` | 在当前事务中创建嵌套事务（保存点） |

### 传播行为示例

#### REQUIRED（默认）

```java
@Service
public class OrderService {
    
    @Autowired
    private PaymentService paymentService;
    
    @Transactional
    public void createOrder() {
        // 保存订单
        orderMapper.insert(order);
        
        // 调用支付，加入当前事务
        paymentService.pay();
        
        // 任一失败，全部回滚
    }
}

@Service
public class PaymentService {
    
    @Transactional(propagation = Propagation.REQUIRED)
    public void pay() {
        // 扣款逻辑
    }
}
```

#### REQUIRES_NEW

适用于需要独立提交的场景，如日志记录：

```java
@Service
public class OrderService {
    
    @Autowired
    private LogService logService;
    
    @Transactional
    public void createOrder() {
        orderMapper.insert(order);
        
        try {
            // 独立事务，不影响主业务
            logService.recordLog("创建订单: " + order.getId());
        } catch (Exception e) {
            // 日志失败不影响订单创建
        }
        
        // 其他业务逻辑...
    }
}

@Service
public class LogService {
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLog(String message) {
        logMapper.insert(new Log(message));
        // 独立提交，即使主事务回滚，日志也保留
    }
}
```

---

## 事务隔离级别（Isolation）

隔离级别解决并发事务带来的问题。

### 并发问题

| 问题 | 说明 |
|------|------|
| **脏读** | 读取到其他事务未提交的数据 |
| **不可重复读** | 同一事务内，两次读取结果不同 |
| **幻读** | 同一事务内，两次查询行数不同 |

### 隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | 说明 |
|----------|------|------------|------|------|
| `READ_UNCOMMITTED` | ✗ | ✗ | ✗ | 最低，基本不用 |
| `READ_COMMITTED` | ✓ | ✗ | ✗ | Oracle 默认 |
| `REPEATABLE_READ` | ✓ | ✓ | ✗ | MySQL 默认 |
| `SERIALIZABLE` | ✓ | ✓ | ✓ | 最高，性能最差 |

```java
// 读已提交 - 防止脏读
@Transactional(isolation = Isolation.READ_COMMITTED)
public void queryData() { }

// 可重复读 - 防止脏读和不可重复读
@Transactional(isolation = Isolation.REPEATABLE_READ)
public void queryData() { }
```

---

## 事务失效场景

### 1. 非 public 方法

```java
@Service
public class UserService {
    
    // ❌ 事务不生效
    @Transactional
    private void privateMethod() { }
    
    // ❌ 事务不生效（默认包可见）
    @Transactional
    void packageMethod() { }
    
    // ❌ 事务不生效
    @Transactional
    protected void protectedMethod() { }
    
    // ✓ 事务生效
    @Transactional
    public void publicMethod() { }
}
```

### 2. 同类内部调用

```java
@Service
public class UserService {
    
    // 调用内部方法，事务不生效
    public void outerMethod() {
        this.innerMethod();  // ❌ 事务失效
    }
    
    @Transactional
    public void innerMethod() {
        // 事务不会生效
    }
}
```

**解决方案：**

```java
@Service
public class UserService {
    
    @Autowired
    private ApplicationContext context;
    
    public void outerMethod() {
        // 通过代理对象调用
        UserService proxy = context.getBean(UserService.class);
        proxy.innerMethod();  // ✓ 事务生效
    }
    
    @Transactional
    public void innerMethod() {
        // 事务生效
    }
}
```

### 3. 异常被捕获

```java
@Service
public class UserService {
    
    @Transactional
    public void saveUser() {
        try {
            userMapper.insert(user);
            int i = 1 / 0;  // 抛出异常
        } catch (Exception e) {
            // ❌ 捕获异常后，事务不会回滚
            log.error("保存失败", e);
        }
    }
}
```

**解决方案：**

```java
@Transactional
public void saveUser() {
    try {
        userMapper.insert(user);
        int i = 1 / 0;
    } catch (Exception e) {
        log.error("保存失败", e);
        // 手动标记回滚
        TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
    }
}
```

### 4. 异常类型不匹配

```java
@Service
public class UserService {
    
    // ❌ 默认只回滚 RuntimeException，IOException 不会回滚
    @Transactional
    public void saveUser() throws IOException {
        userMapper.insert(user);
        throw new IOException("IO异常");
    }
    
    // ✓ 指定回滚所有异常
    @Transactional(rollbackFor = Exception.class)
    public void saveUser() throws IOException {
        userMapper.insert(user);
        throw new IOException("IO异常");
    }
}
```

---

## 长事务优化

长事务会占用数据库连接，影响性能。

### 问题示例

```java
@Service
public class ReportService {
    
    @Transactional
    public void generateReport() {
        // 1. 查询大量数据（耗时）
        List<Data> dataList = dataMapper.selectAll();
        
        // 2. 复杂计算（耗时）
        Report report = calculate(dataList);
        
        // 3. 保存结果
        reportMapper.insert(report);
    }
}
```

### 优化方案

```java
@Service
public class ReportService {
    
    // 查询和计算不需要事务
    public void generateReport() {
        List<Data> dataList = dataMapper.selectAll();
        Report report = calculate(dataList);
        
        // 只在保存时开启事务
        saveReport(report);
    }
    
    @Transactional
    public void saveReport(Report report) {
        reportMapper.insert(report);
    }
}
```

---

## 编程式事务

复杂场景下使用 `TransactionTemplate`：

```java
@Service
public class ComplexService {
    
    @Autowired
    private TransactionTemplate transactionTemplate;
    
    public void complexOperation() {
        // 非事务操作
        doSomething();
        
        // 编程式事务
        Boolean result = transactionTemplate.execute(status -> {
            try {
                orderMapper.insert(order);
                paymentMapper.insert(payment);
                return true;
            } catch (Exception e) {
                status.setRollbackOnly();
                return false;
            }
        });
        
        // 非事务操作
        doAfter();
    }
}
```

---

## 常用属性速查

| 属性 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `propagation` | 传播行为 | `REQUIRED` | `Propagation.REQUIRES_NEW` |
| `isolation` | 隔离级别 | `DEFAULT`（跟随数据库） | `Isolation.READ_COMMITTED` |
| `readOnly` | 只读优化 | `false` | `true` |
| `timeout` | 超时时间（秒） | `-1`（无限制） | `30` |
| `rollbackFor` | 指定回滚异常 | `RuntimeException`、`Error` | `Exception.class`（会额外回滚受检的异常，Error 仍会回滚） |
| `noRollbackFor` | 指定不回滚异常 | 无 | `IllegalArgumentException.class` |

### 完整示例

```java
@Transactional(
    propagation = Propagation.REQUIRED,
    isolation = Isolation.READ_COMMITTED,
    readOnly = false,
    timeout = 30,
    rollbackFor = Exception.class
)
public void businessMethod() {
    // 业务逻辑
}
```
