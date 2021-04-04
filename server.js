'use strict';
const express = require('express');
const server = express();
require('dotenv').config();
const cors = require('cors');

const PORT = process.env.PORT || 5000;

server.use(cors());

server.get('/', (req, res) => {
    res.send('your server is working');
});

server.get('/location', (req, res) => {

    let geoData = require('./data/location.json');
    console.log(geoData);
    let locationData = new Location (geoData);
    res.send(locationData);
});

function Location(locData) {

    this.search_query = 'Lynwood';
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
}

server.get('/weather', (req, res) => {
    let data1 = [];
    let weatherData = require('./data/weather.json');
    // console.log(weatherData);
    weatherData.data.map(val => {
        console.log(val);
        data1.push(new Weather(val));
    });
    res.send(data1);
});
function Weather(locData) {
    console.log(locData);
    this.description = locData.weather.description;
    this.valid_date = locData.valid_date;
}

server.get('*',(req,res)=>{
   
    let errObj = {
        status: 500,
        responseText: 'Sorry, something went wrong'
    };
    res.status(500).send(errObj);
});

server.listen(PORT,()=>{
    console.log(`Listening on PORT ${PORT}`);
});
