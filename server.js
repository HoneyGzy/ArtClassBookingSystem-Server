const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3000;
const mysql = require('mysql2');
const cors = require('cors');
const { format } = require('date-fns');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'oGIPC9UPzGF3cAE0iAhtcSBoLWCW0i3J';

app.use(cors());
// 为了接收 JSON 格式的请求体，我们需要使用 body-parser 中间件.
app.use(bodyParser.json());



// 连接MySQL
var con = mysql.createConnection({
  host: "localhost",
  user: "root", // 需要更改为你的MySQL用户名
  password: "admin", // 需要更改为你的MySQL密码
  database: "courses" // 需要更改为你的数据库名称
});

// 连接验证并创建课程表（如果不存在）
con.connect(function(err) {
  if (err) throw err;
  //创建 courses 表
  con.query(
    "CREATE TABLE IF NOT EXISTS courses (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), description VARCHAR(255), teacher VARCHAR(255), duration INT, date DATETIME, price DECIMAL(5,2))",
    function (err, result) {
      if (err) throw err;
      console.log("Table created");
    });
  
  //创建 users 表
  con.query(
  "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, role VARCHAR(255), username VARCHAR(255), password VARCHAR(255))",
  function (err, result) {
    if (err) throw err;
    console.log("users Table created");
  }); 
});


//课程管理路由添加课程
app.post('/courses', (req, res) => {
  // 将新课程保存到数据库
  var sql = "INSERT INTO courses (title, description, teacher, duration, date, price) VALUES ?";
  var values = [
    [req.body.title, req.body.description, req.body.teacher, req.body.duration, format(new Date(req.body.date), 'yyyy-MM-dd HH:mm:ss'), req.body.price]
  ];
  
  con.query(sql, [values], function (err, result) {
    if (err) {
       console.log(err.code)
      // 检查是否为价格长度过长的错误
      if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
        return res.status(400).json({ error: '价格长度过长' });
      }

      // 其他错误
      return res.status(500).json({ error: '服务器错误' });
    }
    console.log("Number of records inserted: " + result.affectedRows);
    res.status(200).send('课程添加成功');
  });
});

//获取课程列表接口
app.get('/api/courses', (req, res) => {
  let sql = 'SELECT * FROM courses';
  con.query(sql, (err, results) => {
    if(err) throw err;
    res.send(results);
  });
});

// 更新编辑课程接口
app.put('/api/courses/:id', (req, res) => {
  const { title, description, teacher, duration, date, price } = req.body;
  const { id } = req.params;
  const sql = 'UPDATE courses SET title = ?, description = ?, teacher = ?, duration = ?, date = ?, price = ? WHERE id = ?';
  con.query(sql, [title, description, teacher, duration, date, price, id], function (err, result) {
      if (err) {
          console.error(err);
          return res.status(500).send('服务器错误');
      }
      console.log("Number of records updated: " + result.affectedRows);
      res.status(200).send('课程更新成功');
  });
});

// 删除课程接口
app.delete('/api/courses/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM courses WHERE id = ?';
  con.query(sql, [id], function(err, result) {
      if (err) {
          console.error(err);
          return res.status(500).send('服务器错误');
      }
      console.log("Number of records deleted: " + result.affectedRows);
      res.status(200).send('课程删除成功');
  });
});

// 用户登录路由。
app.post('/login', async (req, res) => {
  const { role, username, password } = req.body;

  var sql = "SELECT * FROM users WHERE role = ? AND username = ?"; 
  con.query(sql, [role, username], async function (err, result) {
    if (err) {
      console.error(err);
      return res.status(500).send('服务器错误');
    }

    // 判断结果集的长度，如果长度大于0，说明查询到了匹配的用户。
    if(result.length > 0){
      const compare = await bcrypt.compare(password, result[0].password);
      if(compare) {
        // 生成token，其中可以包含一些用户信息但避免敏感信息
        const token = jwt.sign({ userId: result[0].id, role: result[0].role }, SECRET_KEY, { expiresIn: '1h' });

        // 判断用户角色，如果是admin，返回特定的数据
        if(role === "admin") {
          // 发送包含token的响应和adminFlag
          res.status(200).json({ message: '登录成功', token, adminFlag: true });
        } else {
          // 发送包含token的响应
          res.status(200).json({ message: '登录成功', token });
        }
      } else {
        res.status(401).send('用户名或密码错误');
      }
    } else {
      res.status(401).send('用户名或密码错误');
    }
  });
});

// 用户注册路由
app.post('/api/register', (req, res) => {
  const { role, username, password } = req.body;
  console.log(role, username, password)
  // hash user password
  bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(password, salt, function(err, hash) {
      // Store hashed password in your DB.
      var sql = "INSERT INTO users (role, username, password) VALUES ?";
      var values = [
        [role, username, hash]
      ];
      con.query(sql, [values], function (err, result) {
        if (err) {
          console.error(err);
          return res.status(500).send('服务器错误');
        }
        res.status(200).send('注册成功');
      });
    });
  });
});

//获取用户列表接口
app.get('/api/getusers', (req, res) => {
  let sql = 'SELECT * FROM users';
  con.query(sql, (err, results) => {
    if(err) throw err;
    res.send(results);
  });
});

// PUT 请求的路由处理更新用户信息
app.put('/api/updateUsers/:id', (req, res) => {
  const userId = req.params.id;
  const { role, username, password } = req.body;
  const sql = `UPDATE users SET role = ?, username = ?, password = ? WHERE id = ?`;

  con.query(sql, [role, username, password, userId], (error, results) => {
    if (error) {
      return res.status(500).json({ message: '数据库更新操作失败', error });
    }
    if(results.affectedRows === 0) {
      return res.status(404).json({ message: '未找到对应的用户' });
    }
    res.status(200).json({ message: '用户信息更新成功' });
  });
});

// Delete 请求的路由处理删除用户信息
app.delete('/api/deleteUsers/:id', (req, res) => {
  console.log(req.params.id);
  const userId = req.params.id;
  const sql = `DELETE FROM users WHERE id = ?`;

  con.query(sql, [userId], (error, results) => {
    if (error) {
      return res.status(500).send({ message: '数据库删除操作失败', error });
    }
    if (results.affectedRows === 0) {
      return res.status(404).send({ message: '未找到对应的用户' });
    }
    res.status(200).send({ message: '用户删除成功' });
  });
});

// search 搜索接口
app.get('/api/search', (req, res) => {
  const queryParameters = req.query;

  // 数据库查询语句：在这里您可以根据您的实际需求进行修改
  const sql = `SELECT * FROM courses WHERE title LIKE '%${queryParameters.query}%'`;

  // 执行查询语句
  con.query(sql, function(err, result) {
    if (err) throw err;

    // 返回查询结果
    res.json(result);
  });
});

// 最后，添加错误处理器
app.use(function (err, req, res, next) {
  console.error(err.stack);  // 打印错误堆栈跟踪
  res.status(500).send('服务器错误');
});

// 启动 Express 服务器。
app.listen(port, function() { 
  console.log(`服务器运行在 http://localhost:${port}`);
}); 