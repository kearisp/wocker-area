#!/usr/bin/env node

const {promptConfirm} = require("@wocker/utils");


promptConfirm({
    message: "Yes or no",
    // required: "Hello, this value is required"
}).then((res) => {
    console.log("Result:", res);
});
