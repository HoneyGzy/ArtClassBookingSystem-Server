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


var multer  = require('multer');
var upload = multer({ dest: 'uploads/' }); // 设置文件临时存储路径
var fs = require('fs');

app.use(cors());
// 为了接收 JSON 格式的请求体，我们需要使用 body-parser 中间件.
app.use(bodyParser.json());

app.use('/uploads', express.static('E:/workspace/code/code/ArtClassBookingSystem/ArtClassBookingSystem-Server/uploads'));

// 连接MySQL
var con = mysql.createConnection({
  host: "localhost",
  user: "root", // 需要更改为你的MySQL用户名
  password: "admin", // 需要更改为你的MySQL密码
  //database: "courses" // 需要更改为你的数据库名称
});

// 连接验证并创建数据库和表（如果不存在）
con.connect(function(err) {
  if (err) throw err;
  
  // 创建数据库
  con.query("CREATE DATABASE IF NOT EXISTS courses", function (err, result) {
    if (err) throw err;
    console.log("Database created"); 
  });
  
  // 使用新创建的数据库
  con.query("USE courses", function (err, result) {
    if (err) throw err;
    console.log("Database changed to courses");
  });
  
  //创建 courses 表
  con.query(
    "CREATE TABLE IF NOT EXISTS courses (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), description VARCHAR(255), teacher VARCHAR(255), duration INT, date DATETIME, price DECIMAL(5,2), course_id INT,category VARCHAR(255), difficulty VARCHAR(255), recommended_age INT,teacher_id INT)",
    function (err, result) {
      if (err) throw err;
      console.log("Table created");
    });
  
  //创建 users 表
  con.query(
  "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, role VARCHAR(255), username VARCHAR(255), password VARCHAR(255), teacher_id INT NULL)",
  function (err, result) {
    if (err) throw err;
    console.log("users Table created");
  });

  //创建reservations 表
  con.query(
    "CREATE TABLE IF NOT EXISTS reservations (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(255), courseId VARCHAR(255), reservationStatus VARCHAR(255), courseTime DATETIME, courseTitle VARCHAR(255), paymentStatus VARCHAR(255))",
    function (err, result) {
      if (err) throw err;
      console.log("reservations table created");
    }
  );

   //创建 course_images 表
   con.query(
    "CREATE TABLE IF NOT EXISTS course_images (id INT AUTO_INCREMENT, course_id INT NOT NULL, image BLOB, PRIMARY KEY (id))",
    function (err, result) {
      if (err) throw err;
      console.log("course_images table created");
    }
  );
});


// http://localhost:3000/upload 接口
app.post('/upload', upload.single('file'), (req, res, next) => {
  var file = req.file;
  let tmp_path = file.path;
  let target_path = 'uploads/' + file.originalname;

  var course_id = req.body.course_id; // 获取表单中的课程ID;文件上传表单应该包含名为"course_id"的字段

  var save_image = (path) => {
    var query = 'INSERT INTO `course_images` (`course_id`, `image`) VALUES(?, ?)';
    // 将图片的完整路径存入数据库，而不是整个图片数据
    con.query(query, [course_id, path], (error, results, fields) => {
      if (error) {
        return console.error(error.message);
      }
      console.log('Image Path Saved to DataBase with Course Id: ', course_id, ' and Image Id: ', results.insertId);
    });
  }

  // 将文件移动到期望的位置
  fs.rename(tmp_path, target_path, function(err) {
    if (err) throw err;
    
    // 将图片路径存入数据库
    save_image(target_path);
  });

  res.send("File uploaded");
});

// http://localhost:3000/api/courses_images
app.get('/api/courses_images', (req, res) => {
  let sql = 'SELECT * FROM course_images JOIN courses on course_images.course_id = courses.course_id';
  con.query(sql, (err, results) => {
    if(err) throw err;
    res.send(results);
  });
});


//课程管理路由添加课程
app.post('/api/create_courses', (req, res) => {
  console.log(req);
  // 将新课程保存到数据库
  var sql = "INSERT INTO courses (title, description, teacher, duration, date, price, course_id, category, difficulty, recommended_age, teacher_id ) VALUES ?";
  var values = [
    [req.body.title, req.body.description, req.body.teacher, req.body.duration, format(new Date(req.body.date), 'yyyy-MM-dd HH:mm:ss'), req.body.price, req.body.course_id, req.body.courseCategory,req.body.difficultyLevel,req.body.recommendedAge,req.body.teacher_id]
  ];
  
  con.query(sql, [values], function (err, result) {
    if (err) {
      // 检查是否为价格长度过长的错误
      if (err.code === 'ER_WARN_DATA_OUT_OF_RANGE') {
        return res.status(400).json({ error: '价格长度过长' });
      }
      console.log(err)
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

const categories = {
  'music': '音乐',
  'dance': '舞蹈',
  'draw': '绘画',
  'calligraphy': '书法',
  'design': '设计',
  'sculpture': '雕塑',
  'photo': '摄影',
  'musical': '乐器'
};

app.get('/courses', (req, res) => {
  const type = req.query.type;

  if (!type) {
      res.status(400).send('Missing type parameter');
      return;
  }

   // translate the category
   const chineseCategory = categories[type];
  // Query the database
  con.query('SELECT * FROM courses WHERE category = ?', [chineseCategory], function(error, results, fields) {
      if (error) throw error;
      res.json(results);
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
        } else if (role === "teacher") {
          // 发送包含token的响应 
          res.status(200).json({ message: '登录成功', token, teacherFlag: true });
        } else{
          res.status(200).json({ message: '登录成功', token, studentFlag: true });
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
  console.log(req)
  const { role, username, password, teacherId } = req.body;
  console.log(role, username, password)
  // hash user password
  bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(password, salt, function(err, hash) {
      // Store hashed password in your DB.
      var sql = "INSERT INTO users (role, username, password, teacher_id) VALUES ?";
      var values = [
        [role, username, hash, teacherId]
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

// 对应前端 '/api/postReservation' 的POST请求
app.post('/api/postReservation', (req, res) => {
  try {
      // 从请求体中获取用户名和课程ID
      const { users, courseId, courseTitle } = req.body;

      // 首先检查是否存在相同的预约
      let checkSql = "SELECT * FROM reservations WHERE username = ? AND courseId = ?";
      
      con.query(checkSql, [users, courseId], function (err, result) {
        if (err) return res.json({status: "error", message: "查询预约时出错，请稍后再试"});
        
        if (result.length > 0) {
          // 如果已经存在预约，返回错误消息
          return res.json({status: "error", message: "你已经预约过这门课程了"});
        }

        // 预约信息实体
        let reservation = {
            username: users,
            courseId: courseId,
            courseTitle: courseTitle,
            reservationStatus: '审核中', // 预约状态，这里默认为"成功"
            paymentStatus:'未支付',
            courseTime: new Date() // 课程时间
        }

        // 如果没有预约，进行预约操作
        let sql = "INSERT INTO reservations (username, courseId,reservationStatus, courseTime, courseTitle, paymentStatus) VALUES ?";
        let values = [
          [reservation.username, reservation.courseId, reservation.reservationStatus, reservation.courseTime, reservation.courseTitle,reservation.paymentStatus]
        ];

        con.query(sql, [values], function (err, result) {
          if (err) throw err;
          console.log("Number of records inserted: " + result.affectedRows)

          // 返回预约状态和课程时间
          res.json({
                reservationStatus: reservation.reservationStatus,
                courseTime: reservation.courseTime
          });
        });
      });
  } catch (error) {
      // 发生错误，返回错误状态码和错误信息
      res.status(500).json({error: "预约失败，请稍后再试。"}); 
  }
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


app.get('/api/courseregistration', function(req, res) {
  // 从查询参数中获取用户名
  let username = req.query.username;

  // 构造SQL查询，以在注册表中查找匹配的用户名
  //let sql = `SELECT * FROM reservations WHERE username = ?`;
  let sql = `select * from reservations join courses on reservations.courseTitle = courses.title where reservations.username = ? and reservations.paymentStatus = '未支付'`;

  // 执行查询
  con.query(sql, username, function(err, result) {
    if (err) {
      res.send({ code: 500, message: '服务器出错' });
      throw err;
    }

    // 将查询的结果发送到客户端
    res.send(result);
  });
});

app.get('/api/paycourseregistration', function(req, res) {
  // 从查询参数中获取用户名
  let username = req.query.username;

  // 构造SQL查询，以在注册表中查找匹配的用户名
  //let sql = `SELECT * FROM reservations WHERE username = ?`;
  let sql = `select * from reservations join courses on reservations.courseTitle = courses.title where reservations.username = ? and reservations.paymentStatus = '已支付'`;

  // 执行查询
  con.query(sql, username, function(err, result) {
    if (err) {
      res.send({ code: 500, message: '服务器出错' });
      throw err;
    }

    // 将查询的结果发送到客户端
    res.send(result);
  });
});

app.get('/api/getAllcourseregistration', function(req, res) {
  // 构造SQL查询，以在注册表中查找匹配的用户名
  //let sql = `SELECT * FROM reservations WHERE username = ?`;
  let sql = `select * from reservations where reservations.reservationStatus = '审核中'`;

  // 执行查询
  con.query(sql, function(err, result) {
    if (err) {
      res.send({ code: 500, message: '服务器出错' });
      throw err;
    }

    // 将查询的结果发送到客户端
    res.send(result);
  });
});

app.get('/api/getAllAlreadycourseregistration', function(req, res) {
  // 构造SQL查询，以在注册表中查找匹配的用户名
  //let sql = `SELECT * FROM reservations WHERE username = ?`;
  let sql = `select * from reservations where reservations.reservationStatus = '预约成功'`;

  // 执行查询
  con.query(sql, function(err, result) {
    if (err) {
      res.send({ code: 500, message: '服务器出错' });
      throw err;
    }

    // 将查询的结果发送到客户端
    res.send(result);
  });
});

//教师查询谁预约了自己的课程
app.get('/api/getInfocourseregistration', function(req, res) {
  // 构造SQL查询，以在注册表中查找匹配的用户名
  let username = req.query.username;
  let sql = `SELECT *
  FROM reservations
  WHERE courseId IN (
      SELECT courses.course_id
      FROM users
      INNER JOIN courses ON users.teacher_id = courses.teacher_id
      WHERE users.username = ?
  )
  AND reservationStatus = '预约成功';`;

  // 执行查询
  con.query(sql, [username], function(err, result) {
    if (err) {
      res.send({ code: 500, message: '服务器出错' });
      throw err;
    }

    // 将查询的结果发送到客户端
    res.send(result);
  });
});

//修改课程预约表修改预约状态为预约成功
app.post('/api/courseregistration_status', (req, res) => {
  // 在这里处理你的逻辑，例如记录支付状态到数据库
  let courseId = req.body.params.courseId
  console.log(req.body);  // 查看发送的数据

  // 更新数据库
  const sql = `UPDATE reservations SET reservationStatus = '预约成功' WHERE courseId = ?`;

  con.query(sql, [courseId], (err, result) => {
    if(err) throw err;
    console.log(`更改了${result.affectedRows}行`);
  });
  // 发送响应
  res.send({
    message: 'courseregistration_status received successfully!'
  });
});


app.post('/api/payment-successful', (req, res) => {
  // 在这里处理你的逻辑，例如记录支付状态到数据库
  let courseTitle = req.body.params.courseTitle
  console.log(req.body);  // 查看发送的数据

  // 更新数据库
  const sql = `UPDATE reservations SET paymentStatus = '已支付' WHERE courseTitle = ${mysql.escape(courseTitle)}`;

  console.log(sql)
  con.query(sql, (err, result) => {
      if(err) throw err;
      console.log(`更改了${result.affectedRows}行`);
  });
  // 发送响应
  res.send({
    message: 'Payment received successfully!'
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