// 测试选项解析逻辑

// 模拟parseQuestions函数中的选项解析部分
function testOptionParsing() {
  console.log('测试选项解析逻辑...');
  
  // 测试用例1：连续选项格式
  const testLine1 = 'A.甲状腺功能亢进时下降 B.甲状腺功能亢进时上升 C.单纯性甲状腺肿时上升 D.甲状腺功能减退时上升 E.与甲状腺131I吸收率的变化相一致';
  
  console.log('\n测试用例1 - 连续选项格式:');
  console.log('输入:', testLine1);
  
  const currentQuestion = {
    option_a: null,
    option_b: null,
    option_c: null,
    option_d: null,
    option_e: null
  };
  
  // 应用新的解析逻辑
  if (/^[A-E][.、]/.test(testLine1)) {
    const optionPattern = /([A-E])[.、]([^A-E]*?)(?=\s*[A-E][.、]|$)/g;
    const tempMatches = [...testLine1.matchAll(optionPattern)];
    
    console.log('匹配到的选项数量:', tempMatches.length);
    
    if (tempMatches.length > 1) {
      tempMatches.forEach(optionMatch => {
        const option = optionMatch[1].toLowerCase();
        const optionText = optionMatch[2].trim();
        if (optionText) {
          currentQuestion[`option_${option}`] = optionText;
          console.log(`选项${option.toUpperCase()}:`, optionText);
        }
      });
    }
  }
  
  console.log('\n解析结果:');
  console.log('option_a:', currentQuestion.option_a);
  console.log('option_b:', currentQuestion.option_b);
  console.log('option_c:', currentQuestion.option_c);
  console.log('option_d:', currentQuestion.option_d);
  console.log('option_e:', currentQuestion.option_e);
  
  // 测试用例2：单个选项格式
  console.log('\n\n测试用例2 - 单个选项格式:');
  const testLine2 = 'A.甲状腺功能亢进时下降';
  console.log('输入:', testLine2);
  
  const currentQuestion2 = {
    option_a: null,
    option_b: null,
    option_c: null,
    option_d: null,
    option_e: null
  };
  
  if (/^[A-E][.、]/.test(testLine2)) {
    const optionPattern = /([A-E])[.、]([^A-E]*?)(?=\s*[A-E][.、]|$)/g;
    const tempMatches = [...testLine2.matchAll(optionPattern)];
    
    if (tempMatches.length > 1) {
      // 连续选项
      tempMatches.forEach(optionMatch => {
        const option = optionMatch[1].toLowerCase();
        const optionText = optionMatch[2].trim();
        if (optionText) {
          currentQuestion2[`option_${option}`] = optionText;
        }
      });
    } else {
      // 单个选项
      const option = testLine2.charAt(0).toLowerCase();
      const optionText = testLine2.substring(2).trim();
      currentQuestion2[`option_${option}`] = optionText;
      console.log(`选项${option.toUpperCase()}:`, optionText);
    }
  }
  
  console.log('\n解析结果:');
  console.log('option_a:', currentQuestion2.option_a);
  console.log('option_b:', currentQuestion2.option_b);
}

testOptionParsing();