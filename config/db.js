const mongoose = require('mongoose');

const connection = mongoose.createConnection('mongodb+srv://era:erastore25@era.mtioto9.mongodb.net/Checkin').on('open', ()=>{
    console.log("Database connected successfully");
}).on('error', ()=>{
    console.log("Error connecting to database");
});

module.exports = connection;

//mongodb+srv://era:erastore25@era.mtioto9.mongodb.net/Checkin