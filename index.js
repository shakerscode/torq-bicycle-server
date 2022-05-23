const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
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