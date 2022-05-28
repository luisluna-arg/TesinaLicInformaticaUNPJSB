const express = require('express');
const cors = require('cors');

const app = express();
const morgan = require('morgan');

//settings
app.set('port', process.env.PORT || 13854);
app.set('json spaces', 2);

/* Allow cross origin requests */
app.use(cors());

//middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//Use it as a service
//routers
app.use(require("./routes/index"));

//exec server
app.listen(13854, () => {
    console.log(`Server on port ${app.get('port')}`);
});
