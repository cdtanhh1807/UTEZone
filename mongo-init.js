db = db.getSiblingDB("admin");

db.createUser({
    user: "root",
    pwd: "root",
    roles: [{ role: "root", db: "admin" }]
});

db = db.getSiblingDB("UTEZone");

db.account.insertOne({
  type: "internal",
  email: "admin",
  password: "$2b$12$0EWmWEN/vQrVRvPB6rh9P.mFxkDHo0wjn2Nc4I78P3Eoybd8WHS16",
  role: "Administrator",
  status: "active",
  userInfo: {
      fullName: 'Quản trị viên',
      phone: '',
      address: '',
      email: '',
      day_of_birth: '',
      followers: [],
      followed: [],
      blocks: [],
      description: '',
      department: "Công nghệ thông tin"
  },
  permission: { pernum: '111', validity: '3333-12-12T12:00:00Z' }
});

db.post.createIndex({ visibility: 1, status: 1, createdAt: -1 });
db.post.createIndex({ createdBy: 1, createdAt: -1 });
db.post.createIndex({ "react.love": 1 });
db.post.createIndex({ "react.like": 1 });
db.post.createIndex({ "react.haha": 1 });
db.post.createIndex({ "react.wow": 1 });
db.post.createIndex({ "react.sad": 1 });
db.post.createIndex({ "react.angry": 1 });
db.post.createIndex({ "comments.commentBy": 1 });
db.account.createIndex({ email: 1 });
