const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = 3000;
const mysql = require('mysql2');
const cors = require('cors');
const { format } = require('date-fns');
const moment = require('moment'); // 导入 moment
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const path = require('path');

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
    "CREATE TABLE IF NOT EXISTS course_images (id INT AUTO_INCREMENT PRIMARY KEY, course_id INT NOT NULL UNIQUE, image BLOB, reservation_count INT DEFAULT 0)",
    function (err, result) {
      if (err) throw err;
      console.log("course_images table created");
    }
  );

  // 创建 news_images 表（包括 newid 字段）
  con.query(`
    CREATE TABLE IF NOT EXISTS news_images (
      newid VARCHAR(255) NOT NULL PRIMARY KEY,
      image_path VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      publish_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, function (err, result) {
    if (err) throw err;
    console.log('news_images table created');
  });


  //创建 profile 表
  con.query(
    `CREATE TABLE IF NOT EXISTS profile (
      id INT AUTO_INCREMENT,
      username VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      registerTime DATETIME,
      gender VARCHAR(10),
      parentsName VARCHAR(255),
      parentsPhone VARCHAR(20),
      birthday DATE,
      address VARCHAR(255),
      teacher_id INT,
      PRIMARY KEY (id)
    )`,
    function (err, result) {
      if (err) throw err;
      console.log("profile table created");
    }
  );

  // 创建 course_completion 表
  con.query(
    "CREATE TABLE IF NOT EXISTS course_completion (id INT AUTO_INCREMENT, username VARCHAR(255), course_id INT NOT NULL, teacher VARCHAR(255), title VARCHAR(255), PRIMARY KEY (id))",
    function (err, result) {
      if (err) throw err;
      console.log("course_completion table created");
    }
  );

  // 创建evaluations 表
  con.query(
    'CREATE TABLE IF NOT EXISTS evaluations (id INT AUTO_INCREMENT, teacher VARCHAR(255), course_name VARCHAR(255), comment TEXT, username VARCHAR(255), PRIMARY KEY (id))',
    function (err, result) {
      if (err) throw err;
      console.log('evaluations table created');
    }
  );

  // 创建news 表
  con.query(
    'CREATE TABLE IF NOT EXISTS news (' +
    'id INT AUTO_INCREMENT, ' +
    'title VARCHAR(255) NOT NULL, ' +
    'content TEXT NOT NULL, ' +
    'date DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    'PRIMARY KEY (id))',
    function (err, result) {
      if (err) throw err;
      console.log('news table created');
    }
  );

  // 创建annotation 表
  con.query(
    'CREATE TABLE IF NOT EXISTS annotations (' +
    'id INT AUTO_INCREMENT, ' +
    'title VARCHAR(255) NOT NULL, ' +
    'content TEXT NOT NULL, ' +
    'date DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
    'PRIMARY KEY (id))',
    function (err, result) {
      if (err) throw err;
      console.log('annotations table created');
    }
  );

  //创建contacts表
  con.query(
    'CREATE TABLE IF NOT EXISTS contacts (id INT AUTO_INCREMENT, name VARCHAR(255) NOT NULL, phone VARCHAR(255) NOT NULL, email VARCHAR(255), content TEXT NOT NULL, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id))',
    function (err, result) {
      if (err) throw err;
      console.log('contacts table created');
    }
  );

});

// http://localhost:3000/upload 接口
app.post('/upload', upload.single('file'), (req, res, next) => {
  var file = req.file;
  let tmp_path = file.path;
  let target_path = 'uploads/' + file.originalname;

  var course_id = req.body.course_id; // 获取表单中的课程ID;文件上传表单应该包含名为"course_id"的字段

  console.log('Received course_id:', course_id); // 调试输出

  var save_image = (path) => {
    var query = `
      INSERT INTO course_images (course_id, image)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE image = VALUES(image);
    `;
    
    // 使用 UPSERT 操作插入或更新记录
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
  // SQL 查询语句：按照 reservation_count 从大到小排序，并限制返回前6条记录
  let sql = 'SELECT * FROM course_images ORDER BY reservation_count DESC LIMIT 6';
  
  con.query(sql, (err, results) => {
    if (err) {
      console.error('查询course_images时出错：', err);
      return res.status(500).json({status: "error", message: "查询数据时出错，请稍后再试"});
    }
    
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


//获取指定老师的课程列表接口
app.get('/api/courses/teacher', (req, res) => {
  // 从 req.query 中获取参数，而不是 req.body.params
  let username = req.query.username;

  const sql =  `SELECT * 
  FROM courses
  WHERE teacher_id IN (
    SELECT teacher_id
    FROM users
    WHERE username = ?
  );`; 

  con.query(sql, [username], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('服务器错误');
    }

    // 发送查询结果回客户端，而不是简单的成功消息
    res.status(200).json(result);
  });  
});


// 获取指定课程列表接口
app.get('/api/courses/:course_id', (req, res) => {
  const course_id = req.params.course_id;
  
  console.log(course_id)
  // 使用 `course_id` 查询数据库
  const query = 'SELECT * FROM courses WHERE course_id = ?';
  
  con.query(query, [course_id], (error, results) => {
    if (error) {
      console.error('查询数据库时出错: ', error);
      return res.status(500).json({ error: '数据库查询失败' });
    }
    
    if (results.length > 0) {
      // 如果找到了课程信息，则返回结果
      res.json(results[0]);
    } else {
      // 如果没有找到对应的课程信息，则返回 404
      res.status(404).json({ error: '课程未找到' });
    }
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
  const { 
    course_id,
    title, 
    description, 
    teacher, 
    teacher_id, 
    duration, 
    price, 
    courseCategory, 
    difficultyLevel, 
    recommendedAge 
  } = req.body;
  const { date } = req.body; // 单独获取 date 以便于处理
  const { id } = req.params;

  // 将 date 转换为 MySQL 支持的格式
  const formattedDate = moment(date).format('YYYY-MM-DD HH:mm:ss');

  const sql = `UPDATE courses
               SET course_id = ?, title = ?, description = ?, teacher = ?, teacher_id = ?, duration = ?, date = ?, price = ?, 
               category = ?, difficulty = ?, recommended_age = ?
               WHERE id = ?`;

  con.query(sql, [
    course_id, 
    title, 
    description, 
    teacher, 
    teacher_id, 
    duration,
    formattedDate, // 使用转换后的 date
    price, 
    courseCategory, 
    difficultyLevel, 
    recommendedAge, 
    id
  ], function (err, result) {
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
  const { course_id } = req.body;

  con.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('服务器错误');
    }

    // 检查 course_images 表中是否存在该 course_id 的记录
    const checkCourseImagesSql = 'SELECT COUNT(*) AS count FROM course_images WHERE course_id = ?';
    con.query(checkCourseImagesSql, [course_id], (err, result) => {
      if (err) {
        return con.rollback(() => {
          console.error(err);
          res.status(500).send('服务器错误');
        });
      }

      console.log("Number of records in course_images with course_id:", result[0].count);

      const deleteCourseImagesSql = 'DELETE FROM course_images WHERE course_id = ?';
      con.query(deleteCourseImagesSql, [course_id], (err, result) => {
        if (err) {
          return con.rollback(() => {
            console.error(err);
            res.status(500).send('服务器错误');
          });
        }

        console.log("Number of records deleted in course_images: " + result.affectedRows);

        const deleteCoursesSql = 'DELETE FROM courses WHERE id = ?';
        con.query(deleteCoursesSql, [id], (err, result) => {
          if (err) {
            return con.rollback(() => {
              console.error(err);
              res.status(500).send('服务器错误');
            });
          }

          console.log("Number of records deleted in courses: " + result.affectedRows);

          con.commit(err => {
            if (err) {
              return con.rollback(() => {
                console.error(err);
                res.status(500).send('服务器错误');
              });
            }

            res.status(200).send('课程及相关图片删除成功');
          });
        });
      });
    });
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
  const { role, username, password, teacher_id } = req.body;

  console.log(req.body)
  // hash user password
  bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(password, salt, function(err, hash) {
      // Store hashed password in your DB.
      var sql = "INSERT INTO users (role, username, password, teacher_id) VALUES ?";
      var values = [
        [role, username, hash, teacher_id]
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
            paymentStatus: '未支付',
            courseTime: new Date() // 课程时间
        }

        // 如果没有预约，进行预约操作
        let sql = "INSERT INTO reservations (username, courseId, reservationStatus, courseTime, courseTitle, paymentStatus) VALUES ?";
        let values = [
          [reservation.username, reservation.courseId, reservation.reservationStatus, reservation.courseTime, reservation.courseTitle, reservation.paymentStatus]
        ];

        con.query(sql, [values], function (err, result) {
          if (err) {
            console.error('插入预约记录时出错：', err);
            return res.status(500).json({status: "error", message: "预约插入失败，请稍后再试。"});
          }
          console.log("Number of records inserted: " + result.affectedRows);

          // 更新 course_images 表的 reservation_count 字段
          let updateSql = "UPDATE course_images SET reservation_count = reservation_count + 1 WHERE course_id = ?";
          
          con.query(updateSql, [courseId], function (err, result) {
            if (err) {
              console.error('更新reservation_count时出错：', err);
              return res.status(500).json({status: "error", message: "更新预约计数失败，请稍后再试。"});
            }

            console.log("Number of records updated: " + result.affectedRows);

            // 返回预约状态和课程时间
            res.json({
              reservationStatus: reservation.reservationStatus,
              courseTime: reservation.courseTime
            });
          });
        });
      });
  } catch (error) {
      console.error('处理预约时发生异常：', error);
      // 发生错误，返回错误状态码和错误信息
      res.status(500).json({status: "error", message: "预约失败，请稍后再试。"}); 
  }
});

// search 搜索接口
app.get('/api/search', (req, res) => {
  const queryParameters = req.query;
  const searchQuery = queryParameters.query ? `%${queryParameters.query}%` : '%';
  const category = queryParameters.category ? queryParameters.category : '';

  console.log(searchQuery)
  console.log(category)

  // SQL查询语句：根据参数进行过滤
  let sql = 'SELECT * FROM courses WHERE title LIKE ?';
  const sqlParams = [searchQuery];

  if (category) {
    sql += ' AND category = ?';
    sqlParams.push(category);
  }

  // 执行查询语句
  con.query(sql, sqlParams, function(err, result) {
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
  let sql = `select * from reservations join courses on reservations.courseTitle = courses.title where reservations.username = ? and reservations.reservationStatus = '预约成功'`;

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
  let reservationStatus = req.body.params.reservationStatus
  let username = req.body.params.username

  // 更新数据库
  const sql = `UPDATE reservations SET reservationStatus = ? WHERE courseId = ? AND username = ?`;

  con.query(sql, [reservationStatus,courseId,username], (err, result) => {
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

  // 更新数据库
  const sql = `UPDATE reservations SET paymentStatus = '已支付' WHERE courseTitle = ${mysql.escape(courseTitle)}`;

  con.query(sql, (err, result) => {
      if(err) throw err;
      console.log(`更改了${result.affectedRows}行`);
  });
  // 发送响应
  res.send({
    message: 'Payment received successfully!'
  });
});

// 获取用户信息
app.get('/api/user/profile', (req, res) => {
  const username = req.query.username; // Assuming the username is passed as a query parameter
  const query = 'SELECT * FROM profile WHERE username = ?';
  con.query(query, [username], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});


// API端点，获取用户资料，包括teacher_name
app.get('/api/getuser', (req, res) => {
  const username = req.query.username;
  console.log(username)
  const query = 'SELECT * FROM users WHERE username = ?';
  
  con.query(query, [username], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (results.length > 0) {
      const userProfile = results[0];
      const teacherIdQuery = `
        SELECT courses.teacher, courses.teacher_id
        FROM users
        LEFT JOIN courses ON users.teacher_id = courses.teacher_id
        WHERE users.username = ?`;
      console.log(teacherIdQuery);
      
      con.query(teacherIdQuery, [userProfile.username], (err, teacherResults) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else if (teacherResults.length > 0) {
          userProfile.teacher_id = teacherResults[0].teacher_id;
          userProfile.teacher = teacherResults[0].teacher;
          res.json(userProfile);
        } else {
          res.status(404).json({ error: 'Teacher ID not found' });
        }
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });
});

// 提交用户信息
app.post('/api/user/profile', (req, res) => {
  // 从请求体中获取所有字段
  let { id, username, name, email, phone, registerTime, gender, parentsName, parentsPhone, birthday, address ,teacher_id} = req.body;

  // Parse registerTime to a date object and format it in MySQL standard datetime format
  if (registerTime) {
    registerTime = new Date(registerTime).toISOString().slice(0, 19).replace('T', ' ');
  }

  if (birthday) {
    birthday = new Date(birthday).toISOString().slice(0, 19).replace('T', ' ');
  }

  // 检查用户是否已存在
  const checkQuery = 'SELECT * FROM profile WHERE username = ?';
  con.query(checkQuery, [username], (checkErr, checkResults) => {
    if (checkErr) {
      res.status(500).json({ error: checkErr.message });
    } else if (checkResults.length > 0) {
      // 用户已存在，更新信息
      const updateQuery = `UPDATE profile SET username = ?, name = ?, email = ?, phone = ?, registerTime = ?, gender = ?, parentsName = ?, parentsPhone = ?, birthday = ?, address = ?, teacher_id =? WHERE username = ?`;
      con.query(updateQuery, [username, name, email, phone, registerTime, gender, parentsName, parentsPhone, birthday, address, teacher_id, username], (updateErr) => {
        if (updateErr) {
          res.status(500).json({ error: updateErr.message });
        } else {
          res.json({ message: 'User updated successfully' });
        }
      });
    } else {
      // 新用户，插入记录
      const insertQuery = `INSERT INTO profile (id, username, name, email, phone, registerTime, gender, parentsName, parentsPhone, birthday, address, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      con.query(insertQuery, [id, username, name, email, phone, registerTime, gender, parentsName, parentsPhone, birthday, address, teacher_id], (insertErr) => {
        if (insertErr) {
          res.status(500).json({ error: insertErr.message });
        } else {
          res.json({ message: 'User created successfully' });
        }
      });
    }
  });
});


app.post('/api/course_completion', (req, res) => {
  
  // 从请求体中获取数据
  const username = req.body.username;
  const courseId = req.body.course_id;
  const teacher = req.body.teacher;
  const title = req.body.title;

  // 查询课程是否已经完成
  const selectSql = `
    SELECT * FROM course_completion 
    WHERE username = ? AND course_id = ?
  `;

  con.query(selectSql, [username, courseId], (selectErr, selectResults) => {

    if (selectErr) {
      res.status(500).send('Error in operation');
    } else if (selectResults.length > 0) {
      res.status(200).send('Course already completed');
    } else {
      // 创建插入数据的 SQL 语句
      const insertSql = `
        INSERT INTO course_completion (username, course_id, teacher, title)
        VALUES (?, ?, ?, ?)
      `;

      // 执行 SQL 语句，将数据插入到数据库
      con.query(insertSql, [username, courseId, teacher, title], (insertErr, insertResults) => {
        if (insertErr) {
          res.status(500).send('Error in operation');
        } else {
          res.status(200).send('Successfully inserted data');
        }
      });      
    }
  });
});

app.get('/api/course_completion', (req, res) => {
  const username = req.query.username;
  const sql = `SELECT title, teacher FROM course_completion WHERE username = ?`;

  con.query(sql, username, (error, results, fields) => {
    if (error) {
      res.status(500).send(error);
    } else {
      res.json(results);
    }
  });
});

app.post('/api/evaluations', (req, res) => {
  let form = req.body;
  const checkQuery = 'SELECT * FROM evaluations WHERE teacher = ? AND course_name = ? AND username = ?';
  const checkData = [form.target.split(' (')[1].slice(0, -1), form.course_name, form.username];

  // 先进行查询操作
  con.query(checkQuery, checkData, (err, results) => {
    if (err) {
      console.log(err);
      res.sendStatus(500);
      return;
    }

    if (results.length > 0) {
      // 如果查询结果不为空，说明已有相同记录，返回 409 冲突状态码
      res.sendStatus(409);
    } else {
      // 如果查询结果为空，说明没有相同记录，可以进行插入操作
      const insertQuery = 'INSERT INTO evaluations (teacher, course_name, comment, username) VALUES (?, ?, ?, ?)';
      const insertData = [form.target.split(' (')[1].slice(0, -1), form.course_name, form.content, form.username];
      con.query(insertQuery, insertData, (err, results) => {
        if (err) {
          res.sendStatus(500);
          return;
        }
        res.sendStatus(201);
      });
    }
  });
});

app.get('/api/evaluations', (req, res) => {
  const username = req.query.username;
  const sql = `SELECT * FROM evaluations`;

  con.query(sql, username, (error, results, fields) => {
    if (error) {
      res.status(500).send(error);
    } else {
      res.json(results);
    }
  });
});


//删除评价
app.delete('/api/evaluations/:id', (req, res) => {
  // 从请求的URL中获取评价ID
  const evaluationId = req.params.id;

  // 定义删除评价的SQL语句
  const deleteQuery = 'DELETE FROM evaluations WHERE id = ?';

  // 执行删除操作
  con.query(deleteQuery, [evaluationId], (err, results) => {
    if (err) {
      // 如果删除过程中发生错误，记录错误并返回相应的状态码
      console.error('删除评价时出错:', err);
      return res.status(500).json({ error: '数据库删除错误' });
    }

    // 检查是否真的删除了数据（affectedRows > 0代表有数据被删除）
    if (results.affectedRows > 0) {
      res.status(200).json({ message: '评价删除成功' });
    } else {
      // 没有找到对应ID的评价，可能是ID错误
      res.status(404).json({ message: '评价不存在或已删除' });
    }
  });
});

//更新评价
app.put('/api/evaluations/:id', (req, res) => {
  // 从请求体中获取更新后的评价数据
  const { teacher, course_name, comment, username } = req.body;
  // 从URL参数中获取评价ID
  const evaluationId = req.params.id;

  // 定义更新评价的SQL语句
  const updateQuery = 'UPDATE evaluations SET teacher = ?, course_name = ?, comment = ?, username = ? WHERE id = ?';

  // 执行更新操作
  con.query(updateQuery, [teacher, course_name, comment, username, evaluationId], (err, result) => {
    if (err) {
      console.error('更新评价时出错:', err);
      return res.status(500).json({ error: '数据库更新错误' });
    }

    if (result.affectedRows > 0) {
      // 如果有行受影响，说明更新成功
      res.json({ message: '评价更新成功' });
    } else {
      // 没有行受影响，可能是因为没有找到对应的评价ID
      res.status(404).json({ message: '评价不存在' });
    }
  });
});

//新增资讯
app.post('/api/news', (req, res) => {
  let form = req.body;
  // 输入验证，确保title和content不为空
  if (!form.title || !form.content) {
    return res.status(400).json({ error: 'Title和Content不能为空' });
  }

  const checkQuery = 'SELECT * FROM news WHERE title = ?';
  const checkData = [form.title];

  // 先进行查询操作
  con.query(checkQuery, checkData, (err, results) => {
    if (err) {
      console.error('查询数据库时出错:', err);
      return res.status(500).json({ error: '查询数据库时出错' });
    }

    if (results.length > 0) {
      // 如果查询结果不为空，说明新闻标题已存在，返回 409 冲突状态码
      return res.status(409).json({ error: '新闻标题已存在' });
    } else {
      // 如果查询结果为空，说明新闻标题不存在，可以进行插入操作
      const insertQuery = 'INSERT INTO news (title, content, date) VALUES (?, ?, ?)';
      const insertData = [form.title, form.content, new Date()]; // 假设您想要插入当前日期作为资讯发布时间

      con.query(insertQuery, insertData, (err, results) => {
        if (err) {
          console.error('插入数据库时出错:', err);
          return res.status(500).json({ error: '插入数据库时出错' });
        }
        res.status(200).json({ message: '资讯已添加' }); // 创建成功
      });
    }
  });
});

//获取资讯
app.get('/api/news', (req, res) => {
  // 定义查询新闻表的SQL语句
  const checkQuery = 'SELECT * FROM news';

  // 执行查询操作，这里不需要传入参数
  con.query(checkQuery, (err, results) => {
    if (err) {
      // 如果查询过程中发生错误，记录错误并返回500状态码
      console.error('查询数据库时出错:', err);
      return res.status(500).json({ error: '数据库查询错误' });
    }
 
    // 如果没有错误发生，返回查询结果
    // 此时不需要检查结果是否为空，直接返回所有新闻数据即可
    res.status(200).json(results);
  });
});

//删除资讯
app.delete('/api/news/:id', (req, res) => {
  // 从请求的URL中获取资讯ID
  const newsId = req.params.id;

  // 定义删除资讯的SQL语句
  const deleteQuery = 'DELETE FROM news WHERE id = ?';

  // 执行删除操作
  con.query(deleteQuery, [newsId], (err, results) => {
    if (err) {
      // 如果删除过程中发生错误，记录错误并返回相应的状态码
      console.error('删除资讯时出错:', err);
      return res.status(500).json({ error: '数据库删除错误' });
    }

    // 检查是否真的删除了数据（affectedRows > 0代表有数据被删除）
    if (results.affectedRows > 0) {
      res.status(200).json({ message: '资讯删除成功' });
    } else {
      // 没有找到对应ID的资讯，可能是ID错误
      res.status(404).json({ message: '资讯不存在或已删除' });
    }
  });
});

//更新资讯
app.put('/api/news/:id', (req, res) => {
  // 从请求体中获取更新后的资讯标题和内容
  const { title, content } = req.body;
  // 从URL参数中获取资讯ID
  const newsId = req.params.id;

  // 定义更新资讯的SQL语句
  const updateQuery = 'UPDATE news SET title = ?, content = ?, date = ? WHERE id = ?';

  // 执行更新操作
  con.query(updateQuery, [title, content, new Date(), newsId], (err, result) => {
    if (err) {
      console.error('更新资讯时出错:', err);
      return res.status(500).json({ error: '数据库更新错误' });
    }

    if (result.affectedRows > 0) {
      // 如果有行受影响，说明更新成功
      res.json({ message: '资讯更新成功' });
    } else {
      // 没有行受影响，可能是因为没有找到对应的资讯ID
      res.status(404).json({ message: '资讯不存在' });
    }
  });
});



//新增通知
app.post('/api/annotations', (req, res) => {
  let form = req.body;
  // 输入验证，确保title和content不为空
  if (!form.title || !form.content) {
    return res.status(400).json({ error: 'Title和Content不能为空' });
  }

  const checkQuery = 'SELECT * FROM annotations WHERE title = ?';
  const checkData = [form.title];

  // 先进行查询操作
  con.query(checkQuery, checkData, (err, results) => {
    if (err) {
      console.error('查询数据库时出错:', err);
      return res.status(500).json({ error: '查询数据库时出错' });
    }

    if (results.length > 0) {
      // 如果查询结果不为空，说明新闻标题已存在，返回 409 冲突状态码
      return res.status(409).json({ error: '新闻标题已存在' });
    } else {
      // 如果查询结果为空，说明新闻标题不存在，可以进行插入操作
      const insertQuery = 'INSERT INTO annotations (title, content, date) VALUES (?, ?, ?)';
      const insertData = [form.title, form.content, new Date()]; // 假设您想要插入当前日期作为通知发布时间

      con.query(insertQuery, insertData, (err, results) => {
        if (err) {
          console.error('插入数据库时出错:', err);
          return res.status(500).json({ error: '插入数据库时出错' });
        }
        res.status(200).json({ message: '通知已添加' }); // 创建成功
      });
    }
  });
});

//获取通知
app.get('/api/annotations', (req, res) => {
  // 定义查询新闻表的SQL语句
  const checkQuery = 'SELECT * FROM annotations';

  // 执行查询操作，这里不需要传入参数
  con.query(checkQuery, (err, results) => {
    if (err) {
      // 如果查询过程中发生错误，记录错误并返回500状态码
      console.error('查询数据库时出错:', err);
      return res.status(500).json({ error: '数据库查询错误' });
    }
 
    // 如果没有错误发生，返回查询结果
    // 此时不需要检查结果是否为空，直接返回所有新闻数据即可
    res.status(200).json(results);
  });
});

//删除通知
app.delete('/api/annotations/:id', (req, res) => {
  // 从请求的URL中获取通知ID
  const newsId = req.params.id;

  // 定义删除通知的SQL语句
  const deleteQuery = 'DELETE FROM annotations WHERE id = ?';

  // 执行删除操作
  con.query(deleteQuery, [newsId], (err, results) => {
    if (err) {
      // 如果删除过程中发生错误，记录错误并返回相应的状态码
      console.error('删除通知时出错:', err);
      return res.status(500).json({ error: '数据库删除错误' });
    }

    // 检查是否真的删除了数据（affectedRows > 0代表有数据被删除）
    if (results.affectedRows > 0) {
      res.status(200).json({ message: '通知删除成功' });
    } else {
      // 没有找到对应ID的通知，可能是ID错误
      res.status(404).json({ message: '通知不存在或已删除' });
    }
  });
});

//更新通知
app.put('/api/annotations/:id', (req, res) => {
  // 从请求体中获取更新后的通知标题和内容
  const { title, content } = req.body;
  // 从URL参数中获取通知ID
  const newsId = req.params.id;

  // 定义更新通知的SQL语句
  const updateQuery = 'UPDATE annotations SET title = ?, content = ?, date = ? WHERE id = ?';

  // 执行更新操作
  con.query(updateQuery, [title, content, new Date(), newsId], (err, result) => {
    if (err) {
      console.error('更新通知时出错:', err);
      return res.status(500).json({ error: '数据库更新错误' });
    }

    if (result.affectedRows > 0) {
      // 如果有行受影响，说明更新成功
      res.json({ message: '通知更新成功' });
    } else {
      // 没有行受影响，可能是因为没有找到对应的通知ID
      res.status(404).json({ message: '通知不存在' });
    }
  });
});

// http://localhost:3000/api/news_images 接口
app.post('/api/news_images', upload.single('file'), (req, res, next) => {

  console.log(req.file); // 查看文件对象
  console.log(req.body); // 查看其他表单字段
  var file = req.file;
  let tmp_path = req.file.path;
  let target_path = path.join('uploads', file.originalname);

  var newid = req.body.newid; // 获取表单中的新闻ID
  var title = req.body.title; // 获取新闻标题
  var content = req.body.content; // 获取新闻内容
  var publish_date = req.body.publish_date; // 获取发布日期

  console.log('Received newid:', newid); // 调试输出

  var save_image = (path) => {
    var query = `
      INSERT INTO news_images (newid, image_path, title, content, publish_date)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE image_path = VALUES(image_path), title = VALUES(title), content = VALUES(content), publish_date = VALUES(publish_date);
    `;
    
    // 使用 UPSERT 操作插入或更新记录
    con.query(query, [newid, path, title, content, publish_date], (error, results, fields) => {
      if (error) {
        return console.error(error.message);
      }
      console.log('Image Path Saved to Database with newid: ', newid, ' and Image Id: ', results.insertId);
    });
  }

  // 将文件移动到期望的位置
  fs.rename(tmp_path, target_path, function(err) {
    if (err) throw err;

    // 将图片路径存入数据库
    save_image(target_path);

    res.send("File uploaded and record inserted/updated successfully");
  });
});

// http://localhost:3000/api/courses_images
app.get('/api/news_images', (req, res) => {
  // let sql = 'SELECT * FROM news_images ';
  let sql = 'SELECT * FROM news_images';
  con.query(sql, (err, results) => {
    if(err) throw err;
    res.send(results);
  });
});

// http://localhost:3000/api/courses_images
app.delete('/api/news_images/:newid', (req, res) => {
  // 从请求中获取newid参数
  const { newid } = req.params;

  // DELETE SQL语句，根据newid删除指定的新闻图片
  let sql = 'DELETE FROM news_images WHERE newid = ?';

  // 执行SQL语句
  con.query(sql, [newid], (err, result) => {
    if (err) {
      // 如果执行SQL时出错，返回错误信息
      console.error("Error occurred: ", err);
      res.status(500).send({ error: "An error occurred while deleting the news image." });
    } else {
      // 如果成功执行，响应删除成功的消息
      console.log(`Deleted ${result.affectedRows} row(s)`);
      res.send({ success: true, message: 'News image has been successfully deleted.', deletedNewid: newid });
    }
  });
});


// 新增联系信息
app.post('/api/contact', (req, res) => {
  let form = req.body;
  // 输入验证，确保 name，phone 和 content 不为空
  if (!form.name || !form.phone || !form.content) {
    return res.status(400).json({ error: '姓名、电话和留言内容不能为空' });
  }

  const checkQuery = 'SELECT * FROM contacts WHERE name = ? AND phone = ?';
  const checkData = [form.name, form.phone];

  // 先进行查询操作
  con.query(checkQuery, checkData, (err, results) => {
    if (err) {
      console.error('查询数据库时出错:', err);
      return res.status(500).json({ error: '查询数据库时出错' });
    }

    if (results.length > 0) {
      // 如果查询结果不为空，说明联系信息已存在，返回 409 冲突状态码
      return res.status(409).json({ error: '联系信息已存在' });
    } else {
      // 如果查询结果为空，说明联系信息不存在，可以进行插入操作
      const insertQuery = 'INSERT INTO contacts (name, phone, email, content, date) VALUES (?, ?, ?, ?, ?)';
      const insertData = [form.name, form.phone, form.email, form.content, new Date()];

      con.query(insertQuery, insertData, (err, results) => {
        if (err) {
          console.error('插入数据库时出错:', err);
          return res.status(500).json({ error: '插入数据库时出错' });
        }
        res.status(200).json({ message: '联系信息已提交' }); // 创建成功
      });
    }
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