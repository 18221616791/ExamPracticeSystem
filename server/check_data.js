const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Pass@word1',
  database: 'question_bank',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function checkData() {
  try {
    // 先检查表是否存在和数据总数
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM questions');
    console.log('题库总数:', countResult[0].total);
    
    if (countResult[0].total === 0) {
      console.log('数据库中没有题目数据');
      await pool.end();
      return;
    }
    
    const [rows] = await pool.execute('SELECT id, question_text, option_a, option_b, option_c, option_d, option_e FROM questions LIMIT 3');
    
    console.log('数据库中的选项数据:');
    rows.forEach(row => {
      console.log('题目ID:', row.id);
      console.log('题目:', row.question_text ? row.question_text.substring(0, 50) + '...' : 'null');
      console.log('选项A:', row.option_a || 'null');
      console.log('选项B:', row.option_b || 'null');
      console.log('选项C:', row.option_c || 'null');
      console.log('选项D:', row.option_d || 'null');
      console.log('选项E:', row.option_e || 'null');
      console.log('---');
    });
    
    await pool.end();
  } catch (error) {
    console.error('错误:', error);
  }
}

checkData();