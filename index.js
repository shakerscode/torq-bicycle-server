const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.olmkj.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const verifyJWT = async (req, res, next) =>{
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({message: 'Unauthorized access'})
    }
    const authToken = authorization.split(' ')[1];
    jwt.verify(authToken, process.env.USER_TOKEN, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next()
    })
}


async function run() {

    try {
        await client.connect();
        const partsCollection = client.db("torqBicycle").collection("productParts");
        const reviewsCollection = client.db("torqBicycle").collection("reviews");
        const usersCollection = client.db("torqBicycle").collection("users");
        const ordersCollection = client.db("torqBicycle").collection("orders");

        //posting reviews
        app.post('/reviews', async (req, res) => {
            const order = req.body;
            const result = await reviewsCollection.insertOne(order);
            res.send(result)
        })

        //get one users order not done yet
        app.get('/order', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const result = await ordersCollection.find(filter).toArray();
            res.send(result)
        })

        //getting all users not done yet
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find({}).toArray()
            res.send(result);
        })

        //placing order 
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result)
        })
        //creating user and sending jwt token
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.USER_TOKEN, { expiresIn: '1d' });
            res.send({ result, token })
        })

        //getting single product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await partsCollection.findOne(query);
            res.send(result)
        })

        //getting all reviews
        app.get('/review', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray();
            res.send(result);
        })

        //getting all products
        app.get('/product', async (req, res) => {
            const result = await partsCollection.find({}).toArray();
            res.send(result);
        })

    }
    finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World From Tork bicycle!')
})

app.listen(port, () => {
    console.log(`TorkBicycle app listening on port ${port}`)
})