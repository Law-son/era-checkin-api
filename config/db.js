const mongoose = require('mongoose');

const connection = mongoose.createConnection('mongodb+srv://eyarko:%40password123@lawsonscluster.l1vqepq.mongodb.net/Checkin').on('open', ()=>{
    console.log("Database connected successfully");
}).on('error', ()=>{
    console.log("Error connecting to database");
});

module.exports = connection;