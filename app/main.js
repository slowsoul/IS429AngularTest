var express = require('express'),
    connect = require('connect'),
    app = express(),
    MongoClient = require('mongodb').MongoClient,
    MONGO_PASSWORD = process.env.MONGO_PASSWORD || require('./credentials').MONGO_PASSWORD, 
    connection_string = 'mongodb://is429_user:' + MONGO_PASSWORD + '@ds039088.mongolab.com:39088/mitb_todos';
 
app.set('port', process.env.PORT || 3000);
app.use(connect.compress());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(__dirname + '/'));
 
// MongoDB Connection and Collections
var todo_collection;
MongoClient.connect(connection_string, function(err, db) {
    todo_collection = db.collection('todos');
});

/*
* Parameter handling
* Used when configuring requests with the "/:id" suffix
* Identifies and retrieves the desired todo object from the Database
*/
app.param('id', function(req, res, next, id){
    todo_collection.findOne({
        id: id
    }, function(err, todo) {
        if (err) {
            next(err);
        } else if (todo) {
            req.todo = todo;
        next();
        } else {
            next(new Error('failed to load todo'));
        }
    });
});
    
// Root level routing to index.html        
app.get('/', function (req, res) {
  res.redirect('/index.html');
});

// Retieve all the todos from the todo collection
app.get('/todos', function(req, res) {
    // Todos returned as an array of todo objects
    todo_collection.find().toArray(function(err, todos) {
        if (!err) {
            res.json(todos);
        } else {
            // If there's an error, return an empty array
            res.json([]);
        }
    });
});

// Create a new todo object and store it in the database
app.post('/todos', function(req, res) {
    // form data is contained in the request body, i.e. req.body
    // Collection.insert used to insert new data into the collection
    todo_collection.insert({
        title: req.body.title,
        completed: req.body.completed,
        id: req.body.id
    }, {
        w: 1
    }, function(err, result) {
        if (!err) {
            res.json({
                result: 'success'
            });
        } else {
            res.json({
                result: 'failed',
                error: err
            });
        }
    });
});
    
// Updatae the "completed" property of the todo
app.put('/todos/:id', function(req, res) {
    // Todo determined by the parameter is set in the request object, i.e. req.todo
    var todo = req.todo;
    // Collection.update to update object properties. The $set element in the update query checks the todo's current state and changes it accordingly
    todo_collection.update(todo, {
        $set: {
            completed: (todo.completed === true) ? false : true
        }
    }, function (err, doc) {
        if (!err) {
            res.json({
                result: "Updated"
            });
        }
        else {
            res.json({
                result: "Failed",
                error: err
            });
        }
    });
});

app.delete('/todos/:id', function(req, res) {
    var todo = req.todo;
    // Find and remove the desired todo
    todo_collection.findAndRemove(todo, [['id', 1]], function(err, doc) {
        if (!err) {
            res.json({
                result: 'success'
            });
        } else {
            res.json({
                result: 'failed',
                error: err
            });
        }
    });
});


app.listen(process.env.PORT||3000, function() {
    console.log('Express server listening on port ' + app.get('port'));
});
module.exports = app;