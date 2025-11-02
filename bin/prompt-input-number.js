#!/usr/bin/env node

const {promptInput} = require("@wocker/utils");


promptInput({
    message: "Number",
    prefix: "VALUE=",
    suffix: "/10",
    type: "number",
    required: true,
    min: 5,
    max: 10,
    step: 0.1,
    minLength: 1,
    maxLength: 4
});
