#!/usr/bin/env node

const {promptInput} = require("@wocker/utils");


promptInput({
    message: "Text",
    prefix: "VALUE=",
    suffix: "/suf",
    type: "text",
    required: true,
    min: 5,
    max: 10,
    step: 0.1,
    minLength: 1,
    maxLength: 4
});
