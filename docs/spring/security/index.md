# Spring Boot Security 详解

`spring-boot-starter-security` 是 Spring Boot 官方提供的安全框架，基于 Spring Security 构建，提供**认证（Authentication）** 和**授权（Authorization）**两大核心能力，是企业级应用安全的首选方案。

---

## 目录

- [核心概念](#核心概念)
- [快速开始](#快速开始)
- [认证配置](#认证配置)
- [授权配置](#授权配置)
- [JWT 无状态认证](#jwt-无状态认证)
- [方法级安全控制](#方法级安全控制)
- [自定义登录与登出](#自定义登录与登出)
- [CSRF 防护](#csrf-防护)
- [常见配置场景](#常见配置场景)
- [最佳实践](#最佳实践)

---

## 核心概念

### 认证 vs 授权

| 概念 | 说明 | 典型场景 |
|------|------|----------|
| **认证（Authentication）** | 验证"你是谁" | 登录、Token 验证 |
| **授权（Authorization）** | 验证"你能做什么" | 角色权限、接口访问控制 |

### 核心组件

| 组件 | 说明 |
|------|------|
| `SecurityFilterChain` | 安全过滤器链，定义请求如何被处理 |
| `UserDetailsService` | 加载用户信息的接口，自定义用户来源 |
| `PasswordEncoder` | 密码编码器，用于密码加密与校验 |
| `AuthenticationManager` | 认证管理器，处理认证逻辑 |
| `SecurityContext` | 存储当前已认证用户信息的上下文 |
| `GrantedAuthority` | 权限/角色的抽象，用于授权判断 |

### 过滤器链执行顺序

```
请求进入
    ↓
SecurityContextPersistenceFilter   # 加载/保存 SecurityContext
    ↓
UsernamePasswordAuthenticationFilter  # 处理表单登录
    ↓
BearerTokenAuthenticationFilter    # 处理 JWT Token（可选）
    ↓
ExceptionTranslationFilter         # 处理认证/授权异常
    ↓
FilterSecurityInterceptor          # 执行授权决策
    ↓
到达 Controller
```

---

## 快速开始

### 1. 添加依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

添加依赖后，Spring Boot 会**自动开启**安全防护：
- 所有接口默认需要认证
- 自动生成登录页面 `/login`
- 控制台打印随机密码（默认用户名 `user`）

### 2. 最简配置

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()  // 公开接口
                .anyRequest().authenticated()               // 其余需认证
            )
            .formLogin(Customizer.withDefaults())           // 开启表单登录
            .httpBasic(Customizer.withDefaults());          // 开启 Basic 认证
        
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

---

## 认证配置

### 内存用户（开发测试）

```java
@Bean
public UserDetailsService userDetailsService(PasswordEncoder encoder) {
    UserDetails admin = User.builder()
            .username("admin")
            .password(encoder.encode("123456"))
            .roles("ADMIN")
            .build();

    UserDetails user = User.builder()
            .username("user")
            .password(encoder.encode("123456"))
            .roles("USER")
            .build();

    return new InMemoryUserDetailsManager(admin, user);
}
```

### 数据库用户（生产推荐）

**1. 实现 `UserDetailsService`：**

```java
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 从数据库查询用户
        SysUser sysUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("用户不存在: " + username));

        // 查询用户权限
        List<GrantedAuthority> authorities = sysUser.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getCode()))
                .collect(Collectors.toList());

        return User.builder()
                .username(sysUser.getUsername())
                .password(sysUser.getPassword())
                .authorities(authorities)
                .accountExpired(!sysUser.isActive())
                .disabled(!sysUser.isEnabled())
                .build();
    }
}
```

**2. 注册到安全配置：**

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}
```

### 获取当前登录用户

```java
// 方式一：从 SecurityContext 获取
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
String username = auth.getName();

// 方式二：Controller 方法注入（推荐）
@GetMapping("/profile")
public UserInfo getProfile(@AuthenticationPrincipal UserDetails userDetails) {
    return userService.findByUsername(userDetails.getUsername());
}
```

---

## 授权配置

### URL 级别授权

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(auth -> auth
        // 静态资源和公开接口
        .requestMatchers("/", "/index.html", "/public/**").permitAll()
        .requestMatchers("/actuator/health").permitAll()

        // 管理员接口
        .requestMatchers("/admin/**").hasRole("ADMIN")

        // 多角色均可访问
        .requestMatchers("/api/orders/**").hasAnyRole("ADMIN", "MANAGER")

        // 需要特定权限
        .requestMatchers(HttpMethod.DELETE, "/api/**").hasAuthority("DATA_DELETE")

        // 其余接口需要登录
        .anyRequest().authenticated()
    );

    return http.build();
}
```

### URL 匹配规则

| 匹配方式 | 示例 | 说明 |
|----------|------|------|
| 精确匹配 | `/admin/users` | 只匹配该路径 |
| 前缀匹配 | `/admin/**` | 匹配 admin 下所有路径 |
| 方法限定 | `HttpMethod.POST, "/api/**"` | 限定 HTTP 方法 |
| 正则匹配 | `RegexRequestMatcher` | 使用正则表达式 |

### 角色 vs 权限

```java
// 角色（自动添加 ROLE_ 前缀）
.hasRole("ADMIN")           // 等价于 hasAuthority("ROLE_ADMIN")
.hasAnyRole("ADMIN", "USER")

// 权限（精确匹配，不自动添加前缀）
.hasAuthority("DATA_READ")
.hasAnyAuthority("DATA_READ", "DATA_WRITE")
```

---

## JWT 无状态认证

前后端分离项目中，通常使用 JWT 替代 Session 实现无状态认证。

### 依赖

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

### JWT 工具类

```java
@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration:86400000}")  // 默认 24 小时
    private long expiration;

    /**
     * 生成 Token
     */
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("authorities", userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));

        return Jwts.builder()
                .claims(claims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * 从 Token 解析用户名
     */
    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    /**
     * 校验 Token 是否有效
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaims(token).getExpiration().before(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

### JWT 过滤器

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // 没有 Token 直接放行（后续由 Security 决定是否拦截）
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        try {
            final String username = jwtUtil.extractUsername(token);

            // 当前上下文没有认证信息时，才进行认证
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                if (jwtUtil.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // 将认证信息写入 SecurityContext
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException e) {
            // Token 解析失败，不设置认证信息，由后续过滤器处理 401
        }

        filterChain.doFilter(request, response);
    }
}
```

### 登录接口

```java
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest request) {
        // 触发认证，失败时抛出 AuthenticationException
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(), request.getPassword()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
        String token = jwtUtil.generateToken(userDetails);

        return ResponseEntity.ok(new LoginResponse(token));
    }
}
```

### JWT 安全配置

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                           // JWT 无需 CSRF
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))  // 无状态
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .authenticationProvider(authenticationProvider)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(unauthorizedHandler())    // 401 处理
                .accessDeniedHandler(forbiddenHandler())            // 403 处理
            );

        return http.build();
    }

    /**
     * 401 未认证处理
     */
    @Bean
    public AuthenticationEntryPoint unauthorizedHandler() {
        return (request, response, authException) -> {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"code\":401,\"message\":\"请先登录\"}");
        };
    }

    /**
     * 403 无权限处理
     */
    @Bean
    public AccessDeniedHandler forbiddenHandler() {
        return (request, response, accessDeniedException) -> {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("{\"code\":403,\"message\":\"无访问权限\"}");
        };
    }
}
```

---

## 方法级安全控制

在 Service 层使用注解进行更细粒度的权限控制。

### 开启注解支持

```java
@Configuration
@EnableMethodSecurity   // Spring Boot 3.x 推荐
public class SecurityConfig {
    // ...
}
```

### 常用注解

```java
@Service
public class ArticleService {

    // 需要 ADMIN 角色
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteAll() {
        // ...
    }

    // 需要 DATA_READ 权限
    @PreAuthorize("hasAuthority('DATA_READ')")
    public List<Article> findAll() {
        // ...
    }

    // 只能查看自己的文章（使用 SpEL 表达式）
    @PreAuthorize("#userId == authentication.principal.id")
    public Article findById(Long userId, Long articleId) {
        // ...
    }

    // 方法执行后过滤结果（只返回属于当前用户的数据）
    @PostFilter("filterObject.authorId == authentication.principal.id")
    public List<Article> findByCurrentUser() {
        // ...
    }

    // 同时支持多个条件
    @PreAuthorize("hasRole('ADMIN') or #article.authorId == authentication.principal.id")
    public void update(Article article) {
        // ...
    }

    // 方法执行后校验返回值
    @PostAuthorize("returnObject.authorId == authentication.principal.id")
    public Article getArticle(Long id) {
        // ...
    }
}
```

### 注解对比

| 注解 | 执行时机 | 说明 |
|------|----------|------|
| `@PreAuthorize` | 方法执行前 | 最常用，支持 SpEL 表达式 |
| `@PostAuthorize` | 方法执行后 | 可基于返回值判断 |
| `@PreFilter` | 方法执行前 | 过滤集合类型入参 |
| `@PostFilter` | 方法执行后 | 过滤集合类型返回值 |
| `@Secured` | 方法执行前 | 简单角色校验，不支持 SpEL |

---

## 自定义登录与登出

### 自定义表单登录

```java
http.formLogin(form -> form
    .loginPage("/login")                        // 自定义登录页面路径
    .loginProcessingUrl("/auth/login")          // 表单提交地址
    .defaultSuccessUrl("/dashboard", true)      // 登录成功跳转
    .failureUrl("/login?error=true")            // 登录失败跳转
    .usernameParameter("username")             // 表单用户名字段
    .passwordParameter("password")             // 表单密码字段
    .successHandler(customSuccessHandler())     // 自定义成功处理器
    .failureHandler(customFailureHandler())     // 自定义失败处理器
);
```

### 自定义成功/失败处理（REST 风格）

```java
/**
 * 登录成功：返回 JSON
 */
@Bean
public AuthenticationSuccessHandler loginSuccessHandler() {
    return (request, response, authentication) -> {
        UserDetails user = (UserDetails) authentication.getPrincipal();
        String token = jwtUtil.generateToken(user);

        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            String.format("{\"code\":200,\"data\":{\"token\":\"%s\"}}", token));
    };
}

/**
 * 登录失败：返回 JSON
 */
@Bean
public AuthenticationFailureHandler loginFailureHandler() {
    return (request, response, exception) -> {
        response.setContentType("application/json;charset=UTF-8");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("{\"code\":401,\"message\":\"用户名或密码错误\"}");
    };
}
```

### 自定义登出

```java
http.logout(logout -> logout
    .logoutUrl("/auth/logout")                  // 登出请求地址
    .logoutSuccessUrl("/login?logout=true")      // 登出成功跳转
    .invalidateHttpSession(true)                 // 清除 Session
    .clearAuthentication(true)                   // 清除认证信息
    .deleteCookies("JSESSIONID")                 // 删除 Cookie
    .logoutSuccessHandler((req, res, auth) -> {  // 自定义处理（REST 风格）
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"code\":200,\"message\":\"已退出登录\"}");
    })
);
```

---

## CSRF 防护

### 默认行为

Spring Security 默认开启 CSRF 防护，适用于传统 MVC 应用（表单提交）。

```java
// 前端获取 CSRF Token（Thymeleaf 模板）
<input type="hidden" th:name="${_csrf.parameterName}" th:value="${_csrf.token}"/>

// 或通过 Meta 标签
<meta name="_csrf" th:content="${_csrf.token}"/>
<meta name="_csrf_header" th:content="${_csrf.headerName}"/>
```

### 前后端分离场景禁用 CSRF

```java
// JWT 无状态认证时，禁用 CSRF
http.csrf(csrf -> csrf.disable());
```

### 自定义 CSRF 配置

```java
http.csrf(csrf -> csrf
    // 忽略特定路径
    .ignoringRequestMatchers("/api/webhook/**")
    // 使用 Cookie 存储 CSRF Token（适合前后端分离）
    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
);
```

---

## 常见配置场景

### 场景一：同时支持 Web 和 API

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/**").hasRole("API_USER")
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .requestMatchers("/login", "/css/**", "/js/**").permitAll()
            .anyRequest().authenticated()
        )
        // Web 登录
        .formLogin(form -> form.loginPage("/login").defaultSuccessUrl("/home"))
        // API 登录（Basic 认证）
        .httpBasic(Customizer.withDefaults())
        // JWT 过滤器
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
}
```

### 场景二：放行 Swagger 文档

```java
.requestMatchers(
    "/swagger-ui/**",
    "/swagger-ui.html",
    "/v3/api-docs/**",
    "/webjars/**"
).permitAll()
```

### 场景三：记住我（Remember Me）

```java
http.rememberMe(remember -> remember
    .key("uniqueAndSecretKey")          // 加密 Cookie 的密钥
    .tokenValiditySeconds(7 * 24 * 3600) // 有效期 7 天
    .userDetailsService(userDetailsService)
    .rememberMeParameter("remember-me") // 表单参数名
);
```

### 场景四：配置 CORS

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://your-frontend.com"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
}

// 在 filterChain 中启用
http.cors(cors -> cors.configurationSource(corsConfigurationSource()));
```

---

## 最佳实践

### 1. 密码安全

```java
// 始终使用 BCrypt（cost factor 越高越安全，推荐 10-12）
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
}

// 永远不要存储明文密码
// 错误示例（禁止）：
// user.setPassword(password);

// 正确示例：
user.setPassword(passwordEncoder.encode(password));
```

### 2. JWT Secret 管理

```yaml
# application.yml
app:
  jwt:
    # 使用足够长的随机 Base64 字符串（至少 256 位）
    secret: ${JWT_SECRET}  # 从环境变量读取，不要硬编码
    expiration: 86400000   # 24 小时
```

### 3. 最小权限原则

```java
// 路由规则从细到粗排列，更精确的规则放前面
.requestMatchers("/admin/users/delete").hasRole("SUPER_ADMIN")  // 更细
.requestMatchers("/admin/users/**").hasRole("ADMIN")            // 更粗
.requestMatchers("/admin/**").hasAnyRole("ADMIN", "MANAGER")    // 最粗
```

### 4. 安全响应头

```java
// Spring Security 默认添加多个安全响应头
// 如需自定义：
http.headers(headers -> headers
    .frameOptions(frame -> frame.sameOrigin())          // 允许同源 iframe
    .contentSecurityPolicy(csp -> csp
        .policyDirectives("default-src 'self'"))        // CSP 策略
    .httpStrictTransportSecurity(hsts -> hsts
        .includeSubDomains(true)
        .maxAgeInSeconds(31536000))                     // HSTS
);
```

### 5. 审计日志

```java
@Component
@Slf4j
public class SecurityAuditListener {

    @EventListener
    public void onAuthenticationSuccess(AuthenticationSuccessEvent event) {
        log.info("[安全审计] 登录成功 - 用户: {}", event.getAuthentication().getName());
    }

    @EventListener
    public void onAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
        log.warn("[安全审计] 登录失败 - 用户: {}, 原因: {}",
                event.getAuthentication().getName(),
                event.getException().getMessage());
    }
}
```

---

## 参考资源

- [Spring Security 官方文档](https://docs.spring.io/spring-security/reference/index.html)
- [Spring Boot Security 自动配置源码](https://github.com/spring-projects/spring-boot/tree/main/spring-boot-project/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/security)
- [OWASP 认证与授权最佳实践](https://owasp.org/www-project-top-ten/)
