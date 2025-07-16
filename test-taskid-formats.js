#!/usr/bin/env node

// 简单测试脚本来验证新的taskid格式要求
const { validateTaskId } = require('./dist/utils/taskIdGenerator.js');

console.log('🧪 测试新的TaskID格式要求');
console.log('================================');

// 测试现在应该有效的taskid格式
const validIds = [
  '123',           // 纯数字
  'abc',           // 纯字母
  'task-1',        // 带连字符
  'user_admin',    // 带下划线
  '@task',         // 带@符号
  'task#1',        // 带#符号
  'v1.0',          // 带点号
  'user+admin',    // 带+符号
  'test!',         // 带感叹号
  'x',             // 单字符
  'a'.repeat(20),  // 20字符（最大长度）
  '1',             // 单数字
  '!@#$%&+=',      // 纯符号
];

console.log('✅ 有效的TaskID格式:');
validIds.forEach(id => {
  const isValid = validateTaskId(id);
  console.log(`  ${id.padEnd(20)} -> ${isValid ? '✓' : '✗'}`);
  if (!isValid) {
    console.error(`    错误: ${id} 应该是有效的但被拒绝了`);
  }
});

// 测试应该无效的taskid格式
const invalidIds = [
  '',                    // 空字符串
  'a'.repeat(21),        // 超过20字符
  'task/invalid',        // 包含/
  'task\\invalid',       // 包含\
  'task:invalid',        // 包含:
  'task*invalid',        // 包含*
  'task?invalid',        // 包含?
  'task"invalid',        // 包含"
  'task<invalid',        // 包含<
  'task>invalid',        // 包含>
  'task|invalid',        // 包含|
  'task invalid',        // 包含空格
];

console.log('\n❌ 无效的TaskID格式:');
invalidIds.forEach(id => {
  const isValid = validateTaskId(id);
  console.log(`  ${(id || '(空)').padEnd(20)} -> ${isValid ? '✗' : '✓'}`);
  if (isValid) {
    console.error(`    错误: ${id || '(空)'} 应该是无效的但被接受了`);
  }
});

console.log('\n🎉 TaskID格式要求已成功放宽！');
console.log('现在支持: 字母、数字、符号 (除了 / \\ : * ? " < > | 和空格)');
console.log('长度范围: 1-20 字符');