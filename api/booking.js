'use strict';

const uuid = require('uuid');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.list = (event, context, callback) => {
    var params = {
    TableName: process.env.BOOKINGS_TABLE,
    ProjectionExpression: "id, name, date, location"
    };
    
    console.log("Scanning Bookings table.");
    const onScan = (err, data) => {
        
        if (err) {
            console.log('Scan failed to load data. Error JSON:', JSON.stringify(err, null, 2));
            callback(err);
        } else {
            console.log("Scan succeeded.");
            return callback(null, {
                            statusCode: 200,
                            body: JSON.stringify({
                                                 message: '${id},${name},${date},${location}',
                                                 booking: data.Items
                                                 })
                            });
        }
        
    };
    
    dynamoDb.scan(params, onScan);
    
};

module.exports.submit = (event, context, callback) => {
    const requestBody = JSON.parse(event.body);
    const name = requestBody.name;
    const date = requestBody.date;
    const location = requestBody.location;
    
    if (typeof name !== 'string' || typeof date !== 'string' || typeof location !== 'string') {
        console.error('Validation Failed');
        callback(new Error('Couldn\'t submit booking because of validation errors.'));
        return;
    }
    
    submitBooking(bookingInfo(name, date, location))
    .then(res => {
          callback(null, {
                   statusCode: 200,
                   body: JSON.stringify({
                                        message: 'Successfully submitted booking ${name}',
                                        bookingId: res.id
                                        })
                   });
          })
    .catch(err => {
           console.log(err);
           callback(null, {
                    statusCode: 500,
                    body: JSON.stringify({
                                         message: 'Unable to submit booking ${name}'
                                         })
                    })
           });
};

const submitBooking = booking => {
    console.log('Submitting booking');
    const bookingInfo = {
    TableName: process.env.BOOKINGS_TABLE,
    Item: booking,
    };
    return dynamoDb.put(bookingInfo).promise()
    .then(res => booking);
};


const bookingInfo = (name, date, location) => {
    const timestamp = new Date().getTime();
    return {
    id: uuid.v1(),
    name: name,
    date: date,
    location: location,
    submittedAt: timestamp,
    updatedAt: timestamp,
    };
};

