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
