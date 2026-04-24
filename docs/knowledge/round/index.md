# 四舍五入

## Java 中的四舍五入

### 1. 使用 `Math.round()` 方法四舍五入
```java
double num = 3.14159;
int scale = 2; // 保留两位小数
double factor = Math.pow(10, scale);
// 注意factor是一个double，在Java中操作除法时分整形除法和浮点数除法
double result = Math.round(num * factor) / factor; 
System.out.println(result); // 输出：3.14
```

### 2. 使用 `BigDecimal` 方法四舍五入
```java
BigDecimal value = new BigDecimal("2.35");

// 四舍五入，保留1位小数 -> 2.4
System.out.println(value.setScale(1, RoundingMode.HALF_UP)); 

// 直接截断，保留1位小数 -> 2.3
System.out.println(value.setScale(1, RoundingMode.DOWN));
```

#### 常见的四舍五入模式 (RoundingMode)
在 `BigDecimal` 进行 `divide`（除法计算）或 `setScale`（设置保留小数位数）时，通常需要指定舍入模式。常用的 `RoundingMode` 枚举有：

* **`RoundingMode.HALF_UP`**：最常见的**四舍五入**。如果是 5，则向上进位。
* **`RoundingMode.HALF_DOWN`**：**五舍六入**。如果是 5，则向下舍弃。
* **`RoundingMode.HALF_EVEN`**：**银行家舍入法**（四舍六入五成双）。如果是 5，则看前一位是奇数还是偶数：奇数进位，偶数舍弃（如 `2.5 -> 2`, `3.5 -> 4`）。
* **`RoundingMode.UP`**：始终向远离零的方向舍入（直接进位，无论小数是多少）。
* **`RoundingMode.DOWN`**：始终向接近零的方向舍入（直接截断，不进位）。

## JavaScript 中的四舍五入

### 建议方法
```javascript
// 建议方法
/**
 * 四舍五入，默认保留两位小数
 * @param num
 * @param decimals
 * @returns {number}
 */
export function preciseRound(num, decimals = 2) {
  const factor = Math.pow(10, decimals)
  return Math.round((num * factor).toPrecision(15)) / factor
}
```