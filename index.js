const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.olmkj.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const verifyJWT = async (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const authToken = authorization.split(' ')[1];
    jwt.verify(authToken, process.env.USER_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
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

        //updating status
        app.patch('/order/updating/:id', verifyJWT, async (req, res) =>{
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    status:true
                }
            }
            const updatingStatus = await ordersCollection.updateOne(filter, updateDoc);
            res.send(updatingStatus);
        } )


        //updating orders after a payment completed
        app.patch('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paymentStatus:"paid",
                    transactionId: payment.transactionId
                }
            }
            const updatingOrder = await ordersCollection.updateOne(filter, updateDoc);
            res.send(updatingOrder);
        })


        //payment intent api of user
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const paymentData = req.body;
            const price = paymentData.totalPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"]
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })



        //getting a order inf
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);

        })


        //deleting a order by admin

        app.delete('/admin/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        //deleting a product part by admin

        app.delete('/admin/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(query);
            res.send(result);
        })

        //getting all orders for admin
        app.get('/user-orders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const result = await ordersCollection.find({}).toArray();
                return res.send(result)
            } else {
                res.status(403).send({ message: 'Forbidden access' })
            }

        })

        //adding admin product
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await partsCollection.insertOne(product);
            res.send(result)
        })

        //getting a single  user

        app.get('/web-user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isUser = user.role !== 'admin';
            res.send({ notAdmin: isUser })
        })

        //deleting a order

        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        //getting single admin role
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const isUser = await usersCollection.findOne({ email: email });
            const isAdmin = isUser.role === 'admin';
            res.send({ admin: isAdmin })
        })

        //adding role to users
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const adminRequester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: adminRequester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: {
                        role: 'admin'
                    }
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result)
            } else {
                res.status(403).send({ message: 'Forbidden access' })
            }

        })


        //getting one single user
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result)
        })

        //updating profile
        app.patch('/user/:email', async (req, res) => {
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

        //posting reviews
        app.post('/reviews', async (req, res) => {
            const order = req.body;
            const result = await reviewsCollection.insertOne(order);
            res.send(result)
        })

        //get one users order
        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const result = await ordersCollection.find(query).toArray();
                return res.send(result)
            } else {
                res.status(403).send({ message: 'Forbidden access' })
            }

        })

        //getting all users
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find({}).toArray()
            res.send(result);
        })

        //placing order 
        app.post('/orders', async (req, res) => {
            const isOrder = req.body;
            const result = await ordersCollection.insertOne(isOrder);
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
            console.log(token);
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