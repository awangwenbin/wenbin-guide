# Spring Boot 3.2.12 集成 RabbitMQ

## 1. 依赖配置

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-amqp</artifactId>
</dependency>
```

`spring-boot-starter-amqp` 内部依赖 `spring-amqp` 和 `spring-rabbit`，无需指定版本（由 Spring Boot BOM 管理，3.2.12 对应 `spring-amqp 3.1.x`）。

---

## 2. application.yml 配置

```yaml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest
    virtual-host: /
    # 连接池
    connection-timeout: 15000ms
    # Publisher Confirm（消息发送确认）
    publisher-confirm-type: correlated   # none | simple | correlated
    publisher-returns: true              # 开启 Return 回调
    # 消费者
    listener:
      simple:
        acknowledge-mode: manual         # auto | manual | none
        prefetch: 1                      # 每次拉取消息数
        concurrency: 3                   # 最小消费者线程数
        max-concurrency: 10              # 最大消费者线程数
        retry:
          enabled: true
          max-attempts: 3
          initial-interval: 1000ms
          multiplier: 2.0
          max-interval: 10000ms
```

---

## 3. 核心概念

| 概念 | 说明 |
|------|------|
| Exchange | 交换机，负责路由消息到队列 |
| Queue | 队列，存储消息 |
| Binding | 绑定关系（Exchange → Queue） |
| RoutingKey | 路由键，用于匹配绑定规则 |

### Exchange 类型

| 类型 | 说明 |
|------|------|
| `direct` | 精确匹配 RoutingKey |
| `fanout` | 广播，忽略 RoutingKey |
| `topic` | 通配符匹配（`*` 一个词，`#` 多个词） |
| `headers` | 根据消息头匹配（少用） |

---

## 4. 声明 Exchange、Queue、Binding

```java
import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    // ===== Direct Exchange =====
    public static final String DIRECT_EXCHANGE = "order.direct";
    public static final String ORDER_QUEUE     = "order.queue";
    public static final String ORDER_ROUTING_KEY = "order.create";

    @Bean
    public DirectExchange orderExchange() {
        return ExchangeBuilder.directExchange(DIRECT_EXCHANGE)
                .durable(true)
                .build();
    }

    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable(ORDER_QUEUE)
                // 死信交换机（消息拒绝/过期后转发到这里）
                .withArgument("x-dead-letter-exchange", "order.dlx")
                .withArgument("x-dead-letter-routing-key", "order.dead")
                // 消息 TTL（毫秒）
                .withArgument("x-message-ttl", 60000)
                .build();
    }

    @Bean
    public Binding orderBinding(Queue orderQueue, DirectExchange orderExchange) {
        return BindingBuilder.bind(orderQueue)
                .to(orderExchange)
                .with(ORDER_ROUTING_KEY);
    }

    // ===== Topic Exchange =====
    public static final String TOPIC_EXCHANGE = "log.topic";
    public static final String LOG_QUEUE      = "log.queue";

    @Bean
    public TopicExchange logExchange() {
        return ExchangeBuilder.topicExchange(TOPIC_EXCHANGE).durable(true).build();
    }

    @Bean
    public Queue logQueue() {
        return QueueBuilder.durable(LOG_QUEUE).build();
    }

    @Bean
    public Binding logBinding(Queue logQueue, TopicExchange logExchange) {
        return BindingBuilder.bind(logQueue)
                .to(logExchange)
                .with("log.#");   // 匹配 log.info、log.error.xxx 等
    }

    // ===== Fanout Exchange =====
    public static final String FANOUT_EXCHANGE  = "broadcast.fanout";
    public static final String BROADCAST_QUEUE1 = "broadcast.queue1";
    public static final String BROADCAST_QUEUE2 = "broadcast.queue2";

    @Bean
    public FanoutExchange broadcastExchange() {
        return ExchangeBuilder.fanoutExchange(FANOUT_EXCHANGE).durable(true).build();
    }

    @Bean
    public Queue broadcastQueue1() {
        return QueueBuilder.durable(BROADCAST_QUEUE1).build();
    }

    @Bean
    public Queue broadcastQueue2() {
        return QueueBuilder.durable(BROADCAST_QUEUE2).build();
    }

    @Bean
    public Binding broadcastBinding1(FanoutExchange broadcastExchange) {
        return BindingBuilder.bind(broadcastQueue1()).to(broadcastExchange);
    }

    @Bean
    public Binding broadcastBinding2(FanoutExchange broadcastExchange) {
        return BindingBuilder.bind(broadcastQueue2()).to(broadcastExchange);
    }

    // ===== 死信队列（DLX）=====
    public static final String DLX_EXCHANGE  = "order.dlx";
    public static final String DEAD_QUEUE    = "order.dead.queue";
    public static final String DEAD_ROUTING_KEY = "order.dead";

    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange(DLX_EXCHANGE).durable(true).build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DEAD_QUEUE).build();
    }

    @Bean
    public Binding deadLetterBinding(DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue())
                .to(deadLetterExchange)
                .with(DEAD_ROUTING_KEY);
    }
}
```

---

## 5. 消息序列化配置

默认使用 Java 序列化，**建议改为 JSON**：

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Bean
    public MessageConverter messageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        // 消息无法路由到队列时触发 ReturnCallback
        template.setMandatory(true);
        return template;
    }
}
```

---

## 6. 发送消息

```java
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrderMessageProducer {

    private final RabbitTemplate rabbitTemplate;

    // 基本发送
    public void sendOrder(OrderDTO order) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DIRECT_EXCHANGE,
                RabbitMQConfig.ORDER_ROUTING_KEY,
                order
        );
    }

    // 携带消息属性
    public void sendWithProperties(OrderDTO order) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DIRECT_EXCHANGE,
                RabbitMQConfig.ORDER_ROUTING_KEY,
                order,
                message -> {
                    MessageProperties props = message.getMessageProperties();
                    props.setMessageId(UUID.randomUUID().toString());
                    props.setExpiration("30000");          // 消息级别 TTL（毫秒字符串）
                    props.setHeader("source", "api");
                    return message;
                }
        );
    }

    // 延迟消息（需要 rabbitmq_delayed_message_exchange 插件）
    public void sendDelayed(OrderDTO order, int delayMs) {
        rabbitTemplate.convertAndSend(
                "delay.exchange",
                "delay.key",
                order,
                message -> {
                    message.getMessageProperties().setDelay(delayMs);
                    return message;
                }
        );
    }
}
```

---

## 7. 消费消息

### 7.1 基本消费（自动 ACK）

```java
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class OrderMessageConsumer {

    @RabbitListener(queues = RabbitMQConfig.ORDER_QUEUE)
    public void handleOrder(OrderDTO order) {
        // Spring 自动 ACK（acknowledge-mode: auto）
        System.out.println("收到订单: " + order);
    }
}
```

### 7.2 手动 ACK（推荐生产使用）

```java
import com.rabbitmq.client.Channel;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class OrderMessageConsumer {

    @RabbitListener(queues = RabbitMQConfig.ORDER_QUEUE,
                    ackMode = "MANUAL")   // 覆盖全局配置
    public void handleOrder(OrderDTO order, Message message, Channel channel)
            throws IOException {
        long tag = message.getMessageProperties().getDeliveryTag();
        try {
            // 业务处理
            processOrder(order);
            // 确认消息
            channel.basicAck(tag, false);
        } catch (BusinessException e) {
            // 业务异常：拒绝并不重新入队（进入死信队列）
            channel.basicNack(tag, false, false);
        } catch (Exception e) {
            // 临时异常：拒绝并重新入队
            channel.basicNack(tag, false, true);
        }
    }

    private void processOrder(OrderDTO order) {
        // 业务逻辑...
    }
}
```

### 7.3 批量消费

```java
@RabbitListener(queues = RabbitMQConfig.ORDER_QUEUE,
                containerFactory = "batchFactory")
public void handleBatch(List<OrderDTO> orders) {
    orders.forEach(this::processOrder);
}
```

```java
// 配置批量消费容器工厂
@Bean
public SimpleRabbitListenerContainerFactory batchFactory(
        ConnectionFactory connectionFactory,
        MessageConverter messageConverter) {
    SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
    factory.setConnectionFactory(connectionFactory);
    factory.setMessageConverter(messageConverter);
    factory.setBatchListener(true);
    factory.setConsumerBatchEnabled(true);
    factory.setBatchSize(10);             // 最多一批 10 条
    factory.setReceiveTimeout(1000L);     // 等待凑批超时时间（ms）
    return factory;
}
```

---

## 8. Publisher Confirm（生产者确认）

确保消息到达 Broker：

```java
@Configuration
public class RabbitMQConfig {

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        template.setMandatory(true);

        // 消息成功到达 Exchange 后回调
        template.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                log.error("消息发送到 Exchange 失败, cause={}, correlationData={}",
                        cause, correlationData);
                // 重试或告警
            }
        });

        // 消息无法路由到 Queue 时回调
        template.setReturnsCallback(returned -> {
            log.error("消息路由失败: exchange={}, routingKey={}, replyText={}",
                    returned.getExchange(),
                    returned.getRoutingKey(),
                    returned.getReplyText());
        });

        return template;
    }
}
```

发送时携带 CorrelationData（用于回调时追踪）：

```java
public void sendWithConfirm(OrderDTO order) {
    CorrelationData correlationData = new CorrelationData(UUID.randomUUID().toString());
    rabbitTemplate.convertAndSend(
            RabbitMQConfig.DIRECT_EXCHANGE,
            RabbitMQConfig.ORDER_ROUTING_KEY,
            order,
            correlationData
    );
}
```

---

## 9. 消息幂等性处理

消费者需防止重复消费：

```java
@RabbitListener(queues = RabbitMQConfig.ORDER_QUEUE, ackMode = "MANUAL")
public void handleOrder(OrderDTO order, Message message, Channel channel)
        throws IOException {
    String messageId = message.getMessageProperties().getMessageId();
    long tag = message.getMessageProperties().getDeliveryTag();

    // 利用 Redis 实现幂等
    if (redisTemplate.hasKey("mq:processed:" + messageId)) {
        channel.basicAck(tag, false);  // 已处理，直接 ACK
        return;
    }

    try {
        processOrder(order);
        redisTemplate.opsForValue().set("mq:processed:" + messageId,
                "1", Duration.ofDays(1));
        channel.basicAck(tag, false);
    } catch (Exception e) {
        channel.basicNack(tag, false, true);
    }
}
```

---

## 10. 延迟队列（死信 + TTL 实现）

利用消息 TTL + 死信队列实现延迟效果（无需插件）：

```java
@Configuration
public class DelayQueueConfig {

    // 延迟队列（消息在此 TTL 到期后转到死信交换机）
    @Bean
    public Queue delayQueue() {
        return QueueBuilder.durable("delay.queue")
                .withArgument("x-dead-letter-exchange", "delay.process.exchange")
                .withArgument("x-dead-letter-routing-key", "delay.process")
                .withArgument("x-message-ttl", 10000)   // 10 秒后过期
                .build();
    }

    @Bean
    public DirectExchange delayExchange() {
        return new DirectExchange("delay.exchange");
    }

    @Bean
    public Binding delayBinding() {
        return BindingBuilder.bind(delayQueue())
                .to(delayExchange())
                .with("delay.input");
    }

    // 处理过期消息的实际队列
    @Bean
    public Queue delayProcessQueue() {
        return QueueBuilder.durable("delay.process.queue").build();
    }

    @Bean
    public DirectExchange delayProcessExchange() {
        return new DirectExchange("delay.process.exchange");
    }

    @Bean
    public Binding delayProcessBinding() {
        return BindingBuilder.bind(delayProcessQueue())
                .to(delayProcessExchange())
                .with("delay.process");
    }
}
```

消费延迟后的消息：

```java
@RabbitListener(queues = "delay.process.queue")
public void handleDelayedMessage(OrderDTO order) {
    // 延迟 10 秒后执行
    log.info("延迟消息处理: {}", order);
}
```

---

## 11. 完整生产最佳实践总结

| 场景 | 推荐配置 |
|------|---------|
| 消息可靠性 | `publisher-confirm-type: correlated` + `publisher-returns: true` |
| 消费安全 | `acknowledge-mode: manual` + 业务异常进死信队列 |
| 消息格式 | `Jackson2JsonMessageConverter` |
| 防重复消费 | 消息 ID + Redis 幂等 |
| 流量控制 | `prefetch: 1`（公平调度）|
| 消息追踪 | 携带 `messageId`、`correlationData` |
| 失败兜底 | 配置 DLX 死信队列 |
| 监控 | 接入 RabbitMQ Management Plugin 或 Prometheus |

---

## 12. 测试

```java
@SpringBootTest
class OrderMessageProducerTest {

    @Autowired
    private OrderMessageProducer producer;

    @MockBean
    private RabbitTemplate rabbitTemplate;

    @Test
    void testSendOrder() {
        OrderDTO order = new OrderDTO("123", "PENDING");
        producer.sendOrder(order);

        verify(rabbitTemplate).convertAndSend(
                eq(RabbitMQConfig.DIRECT_EXCHANGE),
                eq(RabbitMQConfig.ORDER_ROUTING_KEY),
                eq(order)
        );
    }
}
```

集成测试（需要运行中的 RabbitMQ 或 Testcontainers）：

```java
@SpringBootTest
@Testcontainers
class RabbitMQIntegrationTest {

    @Container
    static RabbitMQContainer rabbitMQ = new RabbitMQContainer("rabbitmq:3.12-management");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.rabbitmq.host", rabbitMQ::getHost);
        registry.add("spring.rabbitmq.port", rabbitMQ::getAmqpPort);
    }

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Test
    void testSendAndReceive() {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.DIRECT_EXCHANGE,
                RabbitMQConfig.ORDER_ROUTING_KEY,
                new OrderDTO("test-001", "PENDING")
        );
        // 验证消费者处理逻辑...
    }
}
```
