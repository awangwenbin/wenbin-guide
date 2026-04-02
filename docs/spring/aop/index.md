# Spring AOP 详解

AOP（Aspect-Oriented Programming，面向切面编程）是 Spring 框架的核心特性之一，它允许开发者将**横切关注点**（如日志、事务、权限控制等）从业务逻辑中分离出来，实现代码的模块化和复用。

## 什么是 AOP

AOP 是一种编程范式，旨在将那些与业务逻辑无关，但在多个模块中重复出现的功能（横切关注点）抽取出来，通过**动态代理**机制在运行时织入到目标对象中。

### 核心概念

| 术语 | 说明 |
|------|------|
| **Aspect（切面）** | 横切关注点的模块化，包含通知和切点 |
| **Join Point（连接点）** | 程序执行过程中的某个点，如方法调用、异常抛出等 |
| **Pointcut（切点）** | 定义哪些连接点会被拦截的表达式 |
| **Advice（通知）** | 切面在特定连接点执行的动作，包括前置、后置、环绕等 |
| **Target（目标对象）** | 被代理的原始对象 |
| **Proxy（代理）** | AOP 框架创建的对象，包含目标对象和切面逻辑 |
| **Weaving（织入）** | 将切面应用到目标对象的过程 |

### 通知类型

| 通知类型 | 注解 | 执行时机 |
|----------|------|----------|
| 前置通知 | `@Before` | 目标方法执行之前 |
| 后置通知 | `@After` | 目标方法执行之后（无论是否异常）|
| 返回通知 | `@AfterReturning` | 目标方法成功返回之后 |
| 异常通知 | `@AfterThrowing` | 目标方法抛出异常之后 |
| 环绕通知 | `@Around` | 包围目标方法，可控制是否执行 |

---

## 快速开始

### 1. 添加依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

### 2. 定义切面类

```java
@Aspect
@Component
public class LogAspect {

    // 定义切点：拦截 service 包下所有类的所有方法
    @Pointcut("execution(* com.example.service.*.*(..))")
    public void servicePointcut() {}

    // 前置通知
    @Before("servicePointcut()")
    public void beforeAdvice(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        System.out.println("方法 " + methodName + " 开始执行...");
    }

    // 后置通知
    @After("servicePointcut()")
    public void afterAdvice(JoinPoint joinPoint) {
        String methodName = joinPoint.getSignature().getName();
        System.out.println("方法 " + methodName + " 执行结束");
    }

    // 返回通知
    @AfterReturning(pointcut = "servicePointcut()", returning = "result")
    public void afterReturningAdvice(JoinPoint joinPoint, Object result) {
        System.out.println("方法返回结果: " + result);
    }

    // 异常通知
    @AfterThrowing(pointcut = "servicePointcut()", throwing = "ex")
    public void afterThrowingAdvice(JoinPoint joinPoint, Exception ex) {
        System.err.println("方法执行异常: " + ex.getMessage());
    }
}
```

### 3. 环绕通知示例

```java
@Around("servicePointcut()")
public Object aroundAdvice(ProceedingJoinPoint joinPoint) throws Throwable {
    long start = System.currentTimeMillis();
    
    System.out.println("=== 环绕通知：方法执行前 ===");
    
    // 执行目标方法
    Object result = joinPoint.proceed();
    
    long end = System.currentTimeMillis();
    System.out.println("=== 环绕通知：方法执行后，耗时 " + (end - start) + "ms ===");
    
    return result;
}
```

---

## 切点表达式详解

### execution 表达式

最常用的切点表达式，用于匹配方法执行：

```
execution(修饰符? 返回类型 声明类型? 方法名(参数类型) 异常类型?)
```

| 表达式示例 | 含义 |
|-----------|------|
| `execution(* com.example.service.*.*(..))` | 匹配 service 包下所有类的所有方法 |
| `execution(public * *(..))` | 匹配所有 public 方法 |
| `execution(* set*(..))` | 匹配所有以 set 开头的方法 |
| `execution(* com.example.service.AccountService.*(..))` | 匹配 AccountService 类的所有方法 |
| `execution(* com.example.service..*.*(..))` | 匹配 service 包及其子包下所有方法 |
| `execution(* *(String, int))` | 匹配参数为 String 和 int 的方法 |

### 其他切点指示器

| 指示器 | 说明 | 示例 |
|--------|------|------|
| `@annotation` | 匹配带有特定注解的方法 | `@annotation(com.example.Log)` |
| `@within` | 匹配带有特定注解的类 | `@within(com.example.Service)` |
| `within` | 匹配指定类型的类 | `within(com.example.service.*)` |
| `this` | 匹配代理对象为指定类型 | `this(com.example.Service)` |
| `target` | 匹配目标对象为指定类型 | `target(com.example.Service)` |
| `args` | 匹配参数为指定类型 | `args(java.io.Serializable)` |
| `bean` | 匹配指定名称的 Bean | `bean(userService)` |

### 组合表达式

```java
// 组合多个条件
@Pointcut("execution(* com.example.service.*.*(..)) && @annotation(com.example.Log)")
public void logPointcut() {}

// 排除某些方法
@Pointcut("execution(* com.example.service.*.*(..)) && !execution(* com.example.service.*.test*(..))")
public void excludeTest() {}
```

---

## 实际应用场景

### 1. 日志记录

```java
@Aspect
@Component
@Slf4j
public class LoggingAspect {

    @Around("@annotation(com.example.annotation.OperationLog)")
    public Object logAround(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();
        
        log.info("[操作日志] 方法: {}, 参数: {}", methodName, Arrays.toString(args));
        
        try {
            Object result = joinPoint.proceed();
            log.info("[操作日志] 方法: {}, 执行成功", methodName);
            return result;
        } catch (Exception e) {
            log.error("[操作日志] 方法: {}, 执行失败: {}", methodName, e.getMessage());
            throw e;
        }
    }
}
```

### 2. 权限校验

```java
@Aspect
@Component
public class AuthAspect {

    @Autowired
    private TokenService tokenService;

    @Before("@annotation(com.example.annotation.RequireAuth)")
    public void checkAuth(JoinPoint joinPoint) {
        // 获取当前请求
        ServletRequestAttributes attributes = 
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes.getRequest();
        
        String token = request.getHeader("Authorization");
        if (!tokenService.validate(token)) {
            throw new UnauthorizedException("未授权访问");
        }
    }
}
```

### 3. 性能监控

```java
@Aspect
@Component
public class PerformanceAspect {

    @Around("execution(* com.example.controller.*.*(..))")
    public Object monitorPerformance(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        
        Object result = joinPoint.proceed();
        
        long elapsed = System.currentTimeMillis() - start;
        String methodName = joinPoint.getSignature().toShortString();
        
        if (elapsed > 1000) {
            System.err.println("[性能警告] " + methodName + " 执行耗时: " + elapsed + "ms");
        }
        
        return result;
    }
}
```

### 4. 事务管理

Spring 的 `@Transactional` 注解就是基于 AOP 实现的：

```java
@Service
public class OrderService {

    @Transactional(rollbackFor = Exception.class)
    public void createOrder(Order order) {
        // 保存订单
        orderMapper.insert(order);
        // 扣减库存
        stockService.decrease(order.getProductId(), order.getQuantity());
        // 发送消息
        messageService.send(order);
    }
}
```

---

## 底层实现原理

Spring AOP 默认使用 **JDK 动态代理**（目标类实现接口时）或 **CGLIB 代理**（目标类未实现接口时）。

### JDK 动态代理

```java
// 基于接口生成代理对象
public class JdkProxyDemo {
    public static void main(String[] args) {
        UserService target = new UserServiceImpl();
        
        UserService proxy = (UserService) Proxy.newProxyInstance(
            target.getClass().getClassLoader(),
            target.getClass().getInterfaces(),
            (proxyObj, method, args) -> {
                System.out.println("前置处理");
                Object result = method.invoke(target, args);
                System.out.println("后置处理");
                return result;
            }
        );
        
        proxy.saveUser();
    }
}
```

### CGLIB 代理

```java
// 基于继承生成代理类
public class CglibProxyDemo {
    public static void main(String[] args) {
        Enhancer enhancer = new Enhancer();
        enhancer.setSuperclass(UserService.class);
        enhancer.setCallback((MethodInterceptor) (obj, method, args, proxy) -> {
            System.out.println("前置处理");
            Object result = proxy.invokeSuper(obj, args);
            System.out.println("后置处理");
            return result;
        });
        
        UserService proxy = (UserService) enhancer.create();
        proxy.saveUser();
    }
}
```

---

## 注意事项

1. **内部调用问题**：同类中方法 A 调用方法 B，B 上的切面不会生效（因为不是通过代理对象调用）
2. **final 方法**：CGLIB 代理无法拦截 final 方法
3. **私有方法**：AOP 无法拦截私有方法
4. **性能考虑**：过多的切面会增加方法调用开销

---

## 总结

Spring AOP 通过动态代理机制，优雅地解决了横切关注点的代码复用问题。掌握 AOP 的核心概念和切点表达式，能够帮助你写出更加简洁、可维护的代码。

**核心要点：**
- 使用 `@Aspect` 定义切面，`@Pointcut` 定义切点
- 根据场景选择合适的通知类型
- 熟练掌握 execution 表达式匹配规则
- 理解 JDK 动态代理和 CGLIB 代理的区别