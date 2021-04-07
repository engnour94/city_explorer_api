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
server.get('/movies', moviesHandler);
server.get('/yelp', yelpHandler);
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


// https://api.themoviedb.org/3/movie/550?api_key=ec0c4f2689b75c3887a36b2d10209099
// http://localhost:3030/movies?search_query=amman&formatted_query=Amman%2C%2011181%2C%20Jordan&latitude=31.95156940000000&longitude=35.92396250000000&page=1
// https://api.yelp.com/v3/businesses/search?location=${req.query.city}
// https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${city}

function moviesHandler(req, res) {
    let city = req.query.search_query;
    let key= process.env.MOVIE_API_KEY;
    // console.log(req.query);
    let moviesURL= `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${city}`;
    superagent.get(moviesURL)
        .then(moviesData=>{
            console.log(moviesData.body);
            let mData = moviesData.body;
            let data1 =mData.results.map(val => new Movies(val));
            res.send(data1);
        });

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

// http://localhost:3030/yelp?search_query=amman&formatted_query=Amman%2C%2011181%2C%20Jordan&latitude=31.95156940000000&longitude=35.92396250000000&page=1
// https://api.yelp.com/v3/businesses/search?term=delis&latitude=37.786882&longitude=-122.399972
function yelpHandler(req, res) {
    let city = req.query.search_query;
    let page = req.query.page;
    const key= process.env.YELP_API_KEY;
    const numPerPage=5;
    const start = ((page-1)*numPerPage);
    const url = `https://api.yelp.com/v3/businesses/search?location=${city}&limit=${numPerPage}&offset=${start}`;
    superagent.get(url)
        .set('Authorization', `Bearer ${key}`)
        .then(yelpData=>{
            console.log(yelpData.body);
            let yData = yelpData.body;
            let data1 =yData.businesses.map(val => new Yelp (val));
            res.send(data1);
        }).catch(error=>{
            console.log(error);
        }

        )
    ;

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

function Movies (results) {
    console.log(results);
    this.title = results.title;
    this.overview = results.overview;
    this.average_votes=results.vote_average;
    this.total_votes= results.vote_count;
    this.image_url= `https://image.tmdb.org/t/p/w500/${results.poster_path}`;
    this.popularity=results.popularity;
    this.released_on=results.release_date;
}


function Yelp (results) {
    console.log(results);
    this.name = results.name;
    this.image_url = results.image_url;
    this.price=results.price;
    this.rating= results.rating;
    this.url=results.url;

}


client.connect()
    .then(() => {
        server.listen(PORT, () =>
            console.log(`listening on ${PORT}`)
        );
    });
