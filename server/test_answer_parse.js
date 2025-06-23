// 测试修改后的答案解析逻辑
const testText = '答案：A、131I全身显像中发现聚碘的转移灶 答案详解：解析：只有摄取碘的病灶才能用131I治疗。';

console.log('测试文本:', testText);

// 模拟修改后的解析逻辑
const answerMatch = testText.match(/[答案：:](.*)/i);
if (answerMatch) {
  let answerText = answerMatch[1].trim();
  console.log('提取的答案文本:', answerText);
  
  let correct_answer = '';
  let explanation = '';
  
  // 检查是否包含"答案详解"分隔符
  if (answerText.includes('答案详解')) {
    console.log('\n包含"答案详解"分隔符');
    const parts = answerText.split('答案详解');
    const answerPart = parts[0].trim();
    const explanationPart = parts[1] ? parts[1].trim() : '';
    
    console.log('答案部分:', answerPart);
    console.log('解析部分:', explanationPart);
    
    // 从答案部分提取答案标号
    const answerMatch = answerPart.match(/([A-E])[、.]?/i);
    if (answerMatch) {
      correct_answer = answerMatch[1].toUpperCase();
      console.log('提取的答案:', correct_answer);
    }
    
    // 从解析部分提取解析内容
    if (explanationPart) {
      const expMatch = explanationPart.match(/[：:]?解析[：:](.*)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        console.log('提取的解析:', explanation);
      } else if (explanationPart.startsWith('：解析：')) {
        explanation = explanationPart.substring(4).trim();
        console.log('提取的解析(备用方法):', explanation);
      }
    }
  }
  
  console.log('\n最终结果:');
  console.log('correct_answer:', correct_answer);
  console.log('explanation:', explanation);
}

// 测试其他格式
console.log('\n\n测试其他格式:');
const testCases = [
  '答案：A 解析：这是解析内容',
  '答案：B、选项内容',
  '答案：C'
];

testCases.forEach((testCase, index) => {
  console.log(`\n测试案例 ${index + 1}: ${testCase}`);
  const match = testCase.match(/答案[：:](.*)/i);
  if (match) {
    let answerText = match[1].trim();
    console.log('  提取的答案文本:', answerText);
    let correct_answer = '';
    let explanation = '';
    
    if (answerText.includes('答案详解')) {
      // 处理答案详解格式
      const parts = answerText.split('答案详解');
      const answerPart = parts[0].trim();
      const explanationPart = parts[1] ? parts[1].trim() : '';
      
      const answerMatch = answerPart.match(/([A-E])[、.]?/i);
      if (answerMatch) {
        correct_answer = answerMatch[1].toUpperCase();
      }
      
      if (explanationPart) {
        const expMatch = explanationPart.match(/[：:]?解析[：:](.*)/i);
        if (expMatch) {
          explanation = expMatch[1].trim();
        }
      }
    } else {
      // 检查是否包含解析
      if (answerText.includes('解析')) {
        const explanationPattern = /([A-E]).*?解析[：:](.*)/i;
        const expMatch = answerText.match(explanationPattern);
        if (expMatch) {
          correct_answer = expMatch[1].toUpperCase();
          explanation = expMatch[2].trim();
        }
      } else {
        // 简单答案格式
        const simpleAnswerMatch = answerText.match(/^([A-E])[、.]?/);
        if (simpleAnswerMatch) {
          correct_answer = simpleAnswerMatch[1].toUpperCase();
          const remainingText = answerText.substring(simpleAnswerMatch[0].length).trim();
          if (remainingText && remainingText.length > 3) {
            explanation = remainingText;
          }
        } else {
          correct_answer = answerText;
        }
      }
    }
    
    console.log('  答案:', correct_answer);
    console.log('  解析:', explanation);
  }
});