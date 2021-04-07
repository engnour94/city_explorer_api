'use strict';
//DOTENV (read our environment variable)
require('dotenv').config();


const pg = require('pg');
// Application Dependencies
const express = require('express');

//CORS = Cross Origin Resource Sharing
const cors = require('cors');

// client-side HTTP request library
const superagent = require('superagent');

// Application Setup

const server = express();
server.use(cors());
const PORT = process.env.PORT || 5000;

// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,
    ssl:{rejectUnauthorized: false
    }

});


// Routes
server.get('/', homeRouteHandler);
server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/parks', parksHandler);
server.get('*', notFoundHandler);




// Routes Handlers

function homeRouteHandler(req, res) {
    res.send('your server is working');
}
//http://localhost:3030/location?city=amman
function locationHandler( request, response ) {
    let city = request.query.city;
    let SQL = 'SELECT * FROM locations WHERE search_query = $1';
    let safeValues = [city];
    client.query( SQL, safeValues )
        .then ( results =>{
            if( results.rows.length > 0 ){
                response.send( results.rows[0] );
                console.log( results.rows );
            }else{
                let key = process.env.GEOCODE_API_KEY;
                let locURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;
                superagent.get( locURL )
                    .then( geoData => {
                        let apiData = geoData.body;
                        // console.log( apiData );
                        let locationData = new Location( city, apiData );
                        response.send( locationData );
                        // console.log( apiData );
                    } );
            }
        } );
}

function weatherHandler(req, res) {
    let cityName = req.query.search_query;
    let key= process.env.WEATHER_API_KEY;
    // console.log(req.query);
    let weatherURL= `https://api.weatherbit.io/v2.0/forecast/daily?days=8&city=${cityName}&key=${key}`;
    superagent.get(weatherURL)
        .then(weatherData=>{
            console.log(weatherData.body);
            let wData = weatherData.body;
            let data1 =wData.data.map(val => new Weather(val));
            res.send(data1);
        });

}

function parksHandler(req, res) {
    let cityName = req.query.search_query;
    let key= process.env.PARKS_API_KEY;
    // console.log(req.query);
    // https://developer.nps.gov/api/v1/parks?parkCode=acad&api_key=ddoW8eGGBj0qcidA7nH5EDYKcwB6Zz6dJNhNHEez
    let parksURL= `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}`;
    superagent.get(parksURL)
        .then(parksData=>{
            console.log(parksData.body);
            let pData = parksData.body;
            let data1 =pData.data.map(val => new Park(val));
            res.send(data1);
        });

}



function notFoundHandler(req, res) {

    let errObj = {
        status: 500,
        responseText: 'Sorry, something went wrong'
    };
    res.status(500).send(errObj);
}

//Constructors

function Location(cityName,locData) {

    this.search_query = cityName;
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
    {
        let SQL = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;';
        let safeValues = [this.search_query,this.formatted_query,this.latitude,this.longitude];
        client.query( SQL, safeValues )
            .then( results=>{
                return( results.rows );
            } );
    }
}


function Weather(locData) {
    console.log(locData);
    this.forecast = locData.weather.description;
    this.time = locData.valid_date;
}

function Park(data){
    this.name= data.fullName;
    this.address=`${data.addresses[0].postalCode}, ${data.addresses[0].city}, ${data.addresses[0].line1}, ${data.addresses[0].type},  ${data.addresses[0].line3},  ${data.addresses[0].line2}`;
    this.fee= data.entranceFees[0].cost;
    this.description=data.description;
}


client.connect()
    .then(() => {
        server.listen(PORT, () =>
            console.log(`listening on ${PORT}`)
        );
    });
