// ===== AegisAI - Database Setup Script =====
// Run this once: node setup-db.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    console.log('🔧 AegisAI Database Setup');
    console.log('========================\n');

    let connection;

    try {
        console.log('📡 Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT) || 3306,
            ssl: { rejectUnauthorized: false }
        });
        console.log('✅ Connected to MySQL!\n');

        const dbName = process.env.DB_NAME || 'aegisai_insurance';
        console.log(`📦 Creating database "${dbName}"...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`✅ Database "${dbName}" is ready!\n`);

        await connection.query(`USE \`${dbName}\``);

        // Users table
        console.log('👤 Creating "users" table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('✅ "users" table is ready!\n');

        // Proposals table (updated with user_id)
        console.log('📋 Creating "proposals" table...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id VARCHAR(20) PRIMARY KEY,
        user_id INT,
        name VARCHAR(255),
        age INT,
        gender VARCHAR(20),
        dob VARCHAR(20),
        residence VARCHAR(50),
        profession VARCHAR(50),
        height DECIMAL(5,1),
        weight DECIMAL(5,1),
        bmi DECIMAL(5,1),
        father_status VARCHAR(30),
        mother_status VARCHAR(30),
        conditions_list JSON,
        severities JSON,
        smoking VARCHAR(20) DEFAULT 'never',
        alcohol VARCHAR(20) DEFAULT 'never',
        tobacco VARCHAR(20) DEFAULT 'never',
        occupation VARCHAR(30) DEFAULT 'desk_job',
        income VARCHAR(20),
        income_source VARCHAR(30),
        life_cover DECIMAL(15,2) DEFAULT 0,
        cir_cover DECIMAL(15,2) DEFAULT 0,
        accident_cover DECIMAL(15,2) DEFAULT 0,
        emr_score INT,
        emr_breakdown JSON,
        risk_class VARCHAR(20),
        premium JSON,
        status VARCHAR(20) DEFAULT 'pending',
        source VARCHAR(20) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log('✅ "proposals" table is ready!\n');

        // Add user_id column if table already existed without it
        try {
            await connection.query(`ALTER TABLE proposals ADD COLUMN user_id INT AFTER id`);
            await connection.query(`ALTER TABLE proposals ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`);
            console.log('✅ Added user_id column to existing proposals table\n');
        } catch (e) {
            // Column already exists, that's fine
        }

        console.log('🎉 Database setup complete!');
        console.log('   You can now run: node server.js\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Fix: Check your MySQL username/password in the .env file.');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Fix: Make sure MySQL is running: net start MySQL80');
        }
    } finally {
        if (connection) await connection.end();
    }
}

setupDatabase();
