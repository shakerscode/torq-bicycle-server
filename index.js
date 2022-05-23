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


async function run() { 

    try{
        await client.connect();
        const partsCollection = client.db("torqBicycle").collection("productParts");
        const reviewsCollection = client.db("torqBicycle").collection("reviews");
        const usersCollection = client.db("torqBicycle").collection("users");

        //placing order
        //creating user and sending jwt token
        app.put('/user/:email', async(req,res)=>{
            const email= req.params.email;
            const user = req.body;
            const filter = { email:email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
              };
              const result = await usersCollection.updateOne(filter, updateDoc, options);
              const token = jwt.sign({email: email }, process.env.USER_TOKEN, { expiresIn: '1d' });
              res.send({result, token})
        })

        //getting single product
        app.get('/product/:id', async(req, res) => {
            const id = req.params.id;
            const query  = {_id: ObjectId(id)}
            const result = await partsCollection.findOne(query);
            res.send(result)
        })

        //getting all reviews
        app.get('/review', async(req, res)=>{
            const result = await reviewsCollection.find({}).toArray();
            res.send(result);
        })

        //getting all products
        app.get('/product', async(req, res)=>{
            const result = await partsCollection.find({}).toArray();
            res.send(result);
        })

    }
    finally{
        
    }
  }
  run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World From Tork bicycle!')
})

app.listen(port, () => {
  console.log(`TorkBicycle app listening on port ${port}`)
})