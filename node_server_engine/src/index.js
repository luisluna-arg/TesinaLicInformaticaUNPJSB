const express = require('express');
const app = express();
const morgan = require('morgan');

//settings
app.set('port', process.env.PORT || 13854);
app.set('json spaces', 2);

//middleware
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routers
app.use(require("./routes/index"));

//exec server
app.listen(13854, () => {
    console.log(`Server on port ${app.get('port')}`);
});