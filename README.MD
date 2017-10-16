Setup Leave Management System
===

In this documentation is shared the setup of the development environment for Java Enterprise & NodeJS in Ubuntu

`sudo apt-get update && sudo apt-get upgrade`

|   | Software     | Version       | Command           | PATH                |
| - | ------------ | ------------- | ----------------- | ------------------- |
| 1 | NodeJS       | v6.11.1 (LTS) | node -v           |                     |
| 2 | NPM          | 5.3.0         | npm -v            |                     |
| 3 | PM2          | 2.4.6         | pm2 --version     |                     |
| 4 | Mongo DB     | v3.4.4        | mongod -version   | /etc/mongod.conf    |

## 1. Installing & Configuring NodeJS LTS (v6.11.1)

  ```
   curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
   sudo apt-get install nodejs
  ```
  
## 2. Installing & Configuring NPM (5.3.0)

  ```     
   // Upgrade NPM
   sudo npm install -g npm@latest
   
   // [Optional] Some NPM packages will probably throw errors when compiling
   sudo apt-get install build-essential
  ```
  
## 3. Install PM2

  ```
   sudo npm install -g pm2
   
   // to launch PM2 and its managed processes on server boots
   pm2 startup systemd
   
   pm2 list
   
   //Daemonize Application
   pm2 start <app>
   
   // Start project : 
   pm2 start server.js
   
   // Stop project : 
   mp2 kill
   
   // Log app : 
   mp2 logs
  ```  

  
## 4. Installing & Configuring MongoDB
  
### 4.1. Step 1 — Adding the MongoDB Repository

  ```
   // Import the key for the official MongoDB repository
   sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
   
   // Create a list file for MongoDB
   echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
   
   // Update the packages list
   sudo apt-get update
  ```
 
### 4.2. Step 2 — Installing MongoDB

  ```
   // Install mongodb-org, which includes the daemon, configuration and init scripts, shell, and management tools on the server. 
   sudo apt-get install -y mongodb-org

   // Ensure that MongoDB restarts automatically at boot
   sudo systemctl enable mongod
      
   sudo systemctl start mongod
   
   // sudo systemctl status mongod
   // tail -f /var/log/mongodb/mongod.log
  ```  
  
### 4.3. [TODO] Step 3 — Adding an Administrative User: $ `mongo`

  ```
   use admin
   
   db.createUser(
     {
       user: "MongoAdmin",
       pwd: "DigitalPassion2017",
       roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
     }
   )
  ```

- Change Admin password

  ```
   use admin
   
   db.updateUser("MongoAdmin", {pwd: "DigitalPassion2017" }) 
  ```
    
### 4.4. [TODO] Step 4 — Enabling Authentication

- $ `sudo nano /etc/mongod.conf`

  ```
   security:
     authorization: enabled
  ```
  
- $ `sudo systemctl restart mongod`

### 4.5. [TODO] Step 5 — Verifying that Unauthenticated Users are Restricted: $

- $ `mongo -u MongoAdmin -p --authenticationDatabase admin`

  ```
   show dbs
  ``` 

- TODO

  ```
   // mongo -u AdminSammy -p --authenticationDatabase admin --host IP_address_of_MongoHost
   // mongo -u AdminSammy -p --authenticationDatabase admin --host 34.224.53.102
  ```

### 4.6. Testing the Remote Connection

- $ `mongo`

  ```
   show dbs
  ```

- `mongo --host localhost`

### 4.7. Configure a Public BindIP

  ```
   //get IP address
   ifconfig
   // AWS --> 172.31.29.95
   // GCP --> 10.148.0.2
  ```

- $ `sudo nano /etc/mongod.conf`

  ```
   net:
     port: 27017
     # bindIp: 127.0.0.1,ip_address
     # bindIp: 127.0.0.1,172.31.29.95
     bindIp: 127.0.0.1,10.148.0.2
  ```

- $

  ```
   sudo systemctl restart mongod

   // mongo --host 172.31.29.95
   mongo --host 10.148.0.2
  ```

### 4.8. [DANGER] Uninstall MongoDB Community Edition

  ```
   sudo systemctl stop mongod
   
   sudo apt-get purge mongodb-org*

   sudo rm -r /var/log/mongodb
   sudo rm -r /var/lib/mongodb
  ```  

## 1. Setup leave management

### 1.1 Clone source code from git

  ```
    git clone https://bitbucket.org/ttvsolutions/sbot.git
  ```
### 1.2 Import data

 ```
  git clone https://bitbucket.org/ttvsolutions/sbot.git
 ```
### 1.3 Install all module

  ```
    cd leave-management
    sudo npm install
  ```
### 1.4 Start project

  ```
    pm2 start server.js 
  ```
### 1.5 Stop project

  ```
    pm2 kill
  ```
### 1.5 Log app

  ```
    pm2 logs
  ```
## 2. Configuration leave-management
### 2.1 App config
- $ `sudo nano /config/config.json`

  ```
    "API_AI_CLIENT_ACCESS_TOKEN": "***Your API AI Client Access Token***",
    "MICROSOFT_APP_ID": "***Your Microsoft App ID***",
    "MICROSOFT_APP_PASSWORD": "***Your Microsoft App Password***",
    "db": "***Your Mongo DB Config***", //Example: "mongodb://localhost/workplace"
    "excel_path": "***Your path To excel file to import***" //Example: "./assets/test.xlsx"
  ```
  ### 2.2 Workplace config
  - $ `sudo nano /config/workplace_config.json`
  
  ```
    "APP_ID": "***Your Workplace App ID***",
    "WORKPLACE_ACCESS_TOKEN": "***Your Workplace Access Token***",
  ```
## 3. Use API
### 3.1. Import users to workplace
- `Fill all required fields in Sheet 1 of file excel`
- `Request to API`
  ```
    GET /api/excel/accounts
    Result: Import process will logs to console window.
  ```
### 3.2. Import groups to workplace
- `Fill all required fields in Sheet 2 of file excel`
- `Request to API`
  ```
    GET /api/excel/groups
    Result: Import process will logs to console window.
  ```
### 3.3. Query API
- `List users`

  ```
    GET /api/users
    Response: List of workplace users
  ```
  ```
    GET /api/users
    Param: user="***Username or Email of user***"
    Response: Information about this user
  ```
- `Get manager of specific user`

  ```
    GET /api/getManager
    Param: user="***Username or Email of user***"
    Response: Manager of this user
  ```
- `List of groups`

  ```
    GET /api/groups
    Response: List of exist workplace groups
  ```
   ```
    GET /api/groups
    Param: user="***Username or Email of user***"
    Response: List of joined workplace groups of this user
  ```
- `Get information about specific group`

  ```
    GET /api/groups/***Group_Id***
    Response: Information about this group
  ```
  ```
    GET /api/groups/***Group_Id***/admins
    Response: List of admins of this group
  ```
  ```
    GET /api/groups/***Group_Id***/members
    Response: List of members of this group
  ```