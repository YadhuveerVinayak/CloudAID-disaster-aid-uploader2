# 🌐 CloudAidConnectNGO

> A full-stack disaster aid coordination platform built for real-world impact — designed to help citizens report emergencies and enable NGOs to act swiftly.

🔗 **Live Website**: [https://cloudaidconnectngo.onrender.com](https://cloudaidconnectngo.onrender.com)

👩‍💻 Author
# **Harshana Shruthi P**
-📬 Email  harshana2912@gmail.com
-🌐 LinkedIn  https://www.linkedin.com/in/harshana-shruthi-329b99283/
-🎓 Engineering Student | Passionate about Tech for Good

## 🔍 About the Project

**CloudAidConnectNGO** is a disaster aid reporting and coordination system that enables:

- **Citizens** to report aid requirements (with optional images)
- **NGOs** to view, claim, and update status of requests
- **Admins** to manage NGO registrations and aid posts
- **Secure email-based password recovery**

It integrates **Node.js + Express** on the backend with **AWS S3**, **Nodemailer**, and **Render** for hosting — making it production-ready.

---

## 🚀 Features

- ✅ User-friendly UI for login, uploads, and dashboards
- ✅ NGO & Admin role-based access control
- ✅ Aid uploads with image support via AWS S3
- ✅ Dynamic dashboard for tracking request statuses
- ✅ Email-based password reset using Nodemailer
- ✅ Export data as CSV (NGO records & aid posts)
- ✅ Real-time claiming of aid cases by NGOs
- ✅ Fully deployed and accessible via the web

---

## 🛠️ Tech Stack

| Frontend    | Backend              | Cloud/3rd Party     |
|-------------|----------------------|---------------------|
| HTML/CSS/JS | Node.js, Express     | AWS S3 (uploads)    |
|             | bcrypt (hashing)     | Nodemailer (emails) |
|             | express-session      | Render (deployment) |


##Create a **.env** file in the root directory and fill in the required environment variables.

**Start the server locally:**
node app.js
Access the app at http://localhost:3000

## ⚙️ Setup Instructions

Clone the repo and install dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/CloudAID-disaster-aid-uploader.git
cd CloudAID-disaster-aid-uploader
npm install
```
🔐 Environment Variables
Add these to your .env file:
```
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET=your_s3_bucket_name
EMAIL_USER=youremail@example.com
EMAIL_PASS=your_app_specific_password
BASE_URL=https://cloudaidconnectngo.onrender.com
PORT=3000
```
**Note: Never push your .env file to GitHub**


