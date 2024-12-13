#!/usr/bin/env node

const {promptConfirm} = require("@wocker/utils");


promptConfirm({
    message: "Yes or no",
    required: "Value is required",
    default: false
}).then((res) => {
    console.log("Result:", res);
});
