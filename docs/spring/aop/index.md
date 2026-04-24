# Spring AOP 详解
## 核心概念
| 术语 | 说明 |
|------|------|
| **Aspect（切面）** | 横切关注点的模块化，包含通知和切点 |
| **Join Point（连接点）** | 程序执行过程中的某个点，如方法调用、异常抛出等 |
| **Pointcut（切点）** | 定义哪些连接点会被拦截的表达式 |
| **Advice（通知）** | 切面在特定连接点执行的动作，包括前置、后置、环绕等 |
| **Target（目标对象）** | 被代理的原始对象 |
| **Proxy（代理）** | AOP 框架创建的对象，包含目标对象和切面逻辑 |
| **Weaving（织入）** | 将切面应用到目标对象的过程 |
## 通知类型
| 通知类型 | 注解 | 执行时机 |
|----------|------|----------|
| 前置通知 | `@Before` | 目标方法执行之前 |
| 后置通知 | `@After` | 目标方法执行之后（无论是否异常）|
| 返回通知 | `@AfterReturning` | 目标方法成功返回之后 |
| 异常通知 | `@AfterThrowing` | 目标方法抛出异常之后 |
| 环绕通知 | `@Around` | 包围目标方法，可控制是否执行 |
## 快速开始
### 定义切面类

```java
@Aspect // 这个就是切面类
@Component
public class LogAspect {
    // 定义切点：拦截 service 包下所有类的所有方法
    @Pointcut("execution(* com.example.service.*.*(..))") // 这个就是切点
    public void servicePointcut() {}
    // JoinPoint 为连接点（包含了方法调用的所有信息）
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
## 注意事项
1. **内部调用问题**：同类中方法 A 调用方法 B，B 上的切面不会生效（不是通过代理对象调用）
2. **final 方法**：CGLIB 代理无法拦截 final 方法
3. **私有方法**：AOP 无法拦截私有方法
4. **性能考虑**：过多的切面会增加方法调用开销