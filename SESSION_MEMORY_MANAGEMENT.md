# Session Memory Management

## 概述

为了防止长期使用时内存消耗无限增长，系统现在实现了基于LRU（Least Recently Used）算法的session内存管理机制。

## 功能特性

### 1. Session数量限制
- **默认限制**: 100个session
- **可配置**: 通过环境变量 `MAX_SESSIONS` 设置
- **LRU策略**: 当达到限制时，自动清理最久未使用的session

### 2. 自动内存回收
- 不使用session过期机制
- 基于访问频率自动管理内存
- 保持最近使用的session在内存中
- 自动清理包括task数据和workId映射

### 3. 透明操作
- 对现有API完全兼容
- 用户无需修改现有代码
- 自动处理session生命周期

## 配置方法

### 环境变量配置
```bash
# 设置最大session数量为50
export MAX_SESSIONS=50

# 启动服务器
npm start
```

### Docker环境配置
```bash
docker run -e MAX_SESSIONS=200 your-app
```

### 默认配置
如果未设置 `MAX_SESSIONS` 环境变量，系统将使用默认值100。

## 工作原理

### LRU算法实现
1. **访问跟踪**: 每次访问session时更新其在LRU队列中的位置
2. **容量检查**: 添加新session时检查是否超过限制
3. **自动清理**: 超过限制时清理最久未使用的session
4. **数据一致性**: 同时清理task数据和workId映射

### 触发LRU清理的操作
- `update_tasks`: 创建或更新session的task列表
- `get_all_tasks`: 获取session的task列表
- `mark_task_as_done`: 标记task为完成状态
- `save_current_work_info`: 保存工作信息时关联session

## 监控和日志

### 日志信息
系统会记录以下关键事件：
- TaskStoreLRUCache初始化及最大容量
- Session被清理时的详细信息（sessionId、task数量等）

### 示例日志
```json
{"level":30,"time":1753933278236,"maxSize":100,"msg":"TaskStoreLRUCache initialized"}
{"level":30,"time":1753933278245,"evictedSessionId":"session-123","taskCount":5,"newCacheSize":100,"msg":"Evicted LRU session from cache"}
```

## 性能影响

### 内存使用
- **优化前**: 内存使用随session数量线性增长，无上限
- **优化后**: 内存使用稳定在配置的最大session数量

### 性能特征
- **访问时间**: O(1) - 基于HashMap的快速访问
- **LRU更新**: O(1) - 高效的访问顺序维护
- **空间复杂度**: O(MAX_SESSIONS) - 可预测的内存占用

## 最佳实践

### 1. 合理设置限制
```bash
# 根据服务器内存和预期用户数设置
# 小型服务器: 50-100
export MAX_SESSIONS=100

# 中型服务器: 200-500  
export MAX_SESSIONS=300

# 大型服务器: 1000+
export MAX_SESSIONS=1000
```

### 2. 监控内存使用
- 定期检查日志中的session清理事件
- 根据实际使用情况调整 `MAX_SESSIONS` 值
- 监控服务器整体内存使用情况

### 3. 应用设计考虑
- 避免创建过多短期session
- 合理规划session的生命周期
- 重要数据应及时通过 `save_current_work_info` 持久化

## 兼容性

### 向后兼容
- 所有现有API保持不变
- 现有客户端代码无需修改
- 功能行为完全透明

### 升级说明
- 直接部署新版本即可
- 建议设置合适的 `MAX_SESSIONS` 值
- 无需数据迁移或配置变更

## 故障排除

### 常见问题

**Q: Session意外消失了怎么办？**
A: 检查是否达到了MAX_SESSIONS限制，可以通过日志确认。考虑增加MAX_SESSIONS值或优化session使用模式。

**Q: 如何确定合适的MAX_SESSIONS值？**
A: 根据并发用户数和平均session生命周期估算。建议从默认值100开始，根据实际使用情况调整。

**Q: LRU清理会影响性能吗？**
A: 不会。LRU操作都是O(1)时间复杂度，对性能影响微乎其微。

### 调试技巧
1. 启用详细日志查看session清理事件
2. 监控内存使用趋势验证效果
3. 使用较小的MAX_SESSIONS值进行测试验证

## 技术实现

### 核心组件
- `TaskStoreLRUCache`: 主要的LRU缓存实现
- `WorkInfoLRUCache`: 工作信息的LRU缓存（已存在）
- 环境变量配置支持

### 代码修改
- 新增: `src/utils/taskStoreLRUCache.ts`
- 修改: `src/server.ts` - 替换原有的Map存储
- 测试: `test/session-limit-integration.test.ts`

这个实现确保了系统在长期运行时的内存稳定性，同时保持了良好的性能和完全的向后兼容性。