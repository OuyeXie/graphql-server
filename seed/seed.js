import mongoose from 'mongoose'
import User from '../src/server/user'

// connect to mongo

mongoose.connect('mongodb://localhost/graphql')

// seed users

var users = [

    {
        _id: '559645cd1a38532d14349240',
        name: 'Han Solo',
        friends: []
    },

    {
        _id: '559645cd1a38532d14349241',
        name: 'Chewbacca',
        friends: ['559645cd1a38532d14349240']
    },

    {
        _id: '559645cd1a38532d14349242',
        name: 'R2D2',
        friends: ['559645cd1a38532d14349246']
    },

    {
        _id: '559645cd1a38532d14349246',
        name: 'Luke Skywalker',
        friends: ['559645cd1a38532d14349240', '559645cd1a38532d14349242']
    }
]

// drop users collection

mongoose.connection.collections.users.drop(function (err) {
    if (err){
        console.log(err)
    }

    User.create(users, function (createErr, createRes) {

        if (createErr) {
            console.log(createErr)
        }
        else {
            console.log('Seed data created.')
            console.log(createRes)
        }

        process.exit()

    })

})
